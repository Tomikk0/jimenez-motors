const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mariadb = require('mariadb');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mariadb.createPool({
  host: process.env.MARIADB_HOST || 'localhost',
  port: Number(process.env.MARIADB_PORT || 3306),
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'jimenez_motors',
  connectionLimit: Number(process.env.MARIADB_CONNECTION_LIMIT || 5)
});

const allowedTables = new Set([
  'cars',
  'app_users',
  'member_history',
  'members',
  'badges',
  'tuning_options',
  'car_models'
]);

function sanitizeIdentifier(identifier) {
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    throw new Error('Invalid identifier');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
}

function sanitizeColumns(columnString) {
  if (!columnString || columnString.trim() === '' || columnString.trim() === '*') {
    return '*';
  }

  const columns = columnString.split(',').map((col) => col.trim()).filter(Boolean);
  if (columns.length === 0) {
    return '*';
  }

  return columns.map((col) => `\`${sanitizeIdentifier(col)}\``).join(', ');
}

function buildWhereClause(filters = [], params = []) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return { clause: '', params };
  }

  const clauses = filters.map((filter) => {
    const column = sanitizeIdentifier(filter.column);
    switch (filter.operator) {
      case 'eq':
        params.push(filter.value);
        return `\`${column}\` = ?`;
      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }
  });

  return {
    clause: `WHERE ${clauses.join(' AND ')}`,
    params
  };
}

function buildOrderClause(order = []) {
  if (!Array.isArray(order) || order.length === 0) {
    return '';
  }

  const clauses = order.map(({ column, ascending }) => {
    const col = sanitizeIdentifier(column);
    return `\`${col}\` ${ascending === false ? 'DESC' : 'ASC'}`;
  });

  return `ORDER BY ${clauses.join(', ')}`;
}

async function executeQuery(query, params = []) {
  const connection = await pool.getConnection();
  try {
    return await connection.query(query, params);
  } finally {
    connection.release();
  }
}

app.use(cors());
app.use(express.json({ limit: process.env.REQUEST_LIMIT || '15mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/query', async (req, res) => {
  const {
    table,
    operation,
    data,
    columns = '*',
    filters = [],
    order = [],
    single = false,
    returning = false,
    limit
  } = req.body || {};

  try {
    if (!allowedTables.has(table)) {
      return res.status(400).json({ data: null, error: { message: 'Invalid table requested' } });
    }

    const sanitizedColumns = sanitizeColumns(columns);

    switch (operation) {
      case 'select': {
        const whereParams = [];
        const { clause, params } = buildWhereClause(filters, whereParams);
        const orderClause = buildOrderClause(order);
        let query = `SELECT ${sanitizedColumns} FROM \`${table}\` ${clause}`;
        if (orderClause) {
          query += ` ${orderClause}`;
        }
        const limitValue = Number(limit);
        if (!Number.isNaN(limitValue) && Number.isFinite(limitValue)) {
          query += ' LIMIT ' + limitValue;
        }
        const rows = await executeQuery(query, params);
        return res.json({ data: single ? (rows[0] || null) : rows, error: null });
      }
      case 'insert': {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Insert data must be a non-empty array');
        }

        const keys = Object.keys(data[0]);
        if (keys.length === 0) {
          throw new Error('Insert payload must contain at least one column');
        }

        const columnsClause = keys.map((key) => `\`${sanitizeIdentifier(key)}\``).join(', ');
        const placeholderGroup = `(${keys.map(() => '?').join(', ')})`;
        const values = [];
        data.forEach((row) => {
          keys.forEach((key) => {
            values.push(row[key] !== undefined ? row[key] : null);
          });
        });
        const placeholders = Array(data.length).fill(placeholderGroup).join(', ');
        const insertQuery = `INSERT INTO \`${table}\` (${columnsClause}) VALUES ${placeholders}`;
        const result = await executeQuery(insertQuery, values);

        if (returning) {
          if (typeof result.insertId !== 'number') {
            throw new Error('The target table must provide an auto-increment id to return inserted rows');
          }

          const firstId = result.insertId;
          const ids = Array.from({ length: data.length }, (_, index) => firstId + index);
          const idPlaceholders = ids.map(() => '?').join(', ');
          const selectQuery = `SELECT ${sanitizedColumns} FROM \`${table}\` WHERE \`id\` IN (${idPlaceholders})`;
          const rows = await executeQuery(selectQuery, ids);

          const orderMap = new Map(ids.map((id, index) => [id, index]));
          rows.sort((a, b) => {
            const aIndex = orderMap.get(a.id) ?? 0;
            const bIndex = orderMap.get(b.id) ?? 0;
            return aIndex - bIndex;
          });

          return res.json({ data: rows, error: null });
        }

        return res.json({ data: { inserted: result.affectedRows }, error: null });
      }
      case 'update': {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('Update data must be an object');
        }
        if (!filters || filters.length === 0) {
          throw new Error('Update operations require at least one filter');
        }

        const setClauses = [];
        const setParams = [];
        Object.entries(data).forEach(([key, value]) => {
          setClauses.push(`\`${sanitizeIdentifier(key)}\` = ?`);
          setParams.push(value);
        });

        const whereParams = [];
        const { clause, params } = buildWhereClause(filters, whereParams);
        const updateQuery = `UPDATE \`${table}\` SET ${setClauses.join(', ')} ${clause}`;
        await executeQuery(updateQuery, [...setParams, ...params]);

        if (returning) {
          const orderClause = buildOrderClause(order);
          let selectQuery = `SELECT ${sanitizedColumns} FROM \`${table}\` ${clause}`;
          if (orderClause) {
            selectQuery += ` ${orderClause}`;
          }
          const rows = await executeQuery(selectQuery, params);
          return res.json({ data: single ? (rows[0] || null) : rows, error: null });
        }

        return res.json({ data: { updated: true }, error: null });
      }
      case 'delete': {
        if (!filters || filters.length === 0) {
          throw new Error('Delete operations require at least one filter');
        }
        const whereParams = [];
        const { clause, params } = buildWhereClause(filters, whereParams);
        const deleteQuery = `DELETE FROM \`${table}\` ${clause}`;
        const result = await executeQuery(deleteQuery, params);
        return res.json({ data: { deleted: result.affectedRows }, error: null });
      }
      default:
        throw new Error('Unsupported operation');
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(400).json({ data: null, error: { message: error.message } });
  }
});

const rootDir = path.resolve(__dirname, '..');
app.use(express.static(rootDir));

app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Jimenez Motors server listening on port ${PORT}`);
});
