import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jimenez_motors',
  waitForConnections: true,
  connectionLimit: 10
});

app.use(cors());
app.use(express.json({ limit: '15mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '..');
app.use(express.static(clientDir));

app.get('/api/health', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/query', async (req, res) => {
  const { table, action } = req.body || {};

  if (!table || !action) {
    return res.status(400).json({ data: null, error: { message: 'Table and action are required' } });
  }

  try {
    const result = await executeQuery(req.body);
    res.json({ data: result, error: null });
  } catch (error) {
    console.error('MySQL query error:', error);
    res.status(500).json({ data: null, error: { message: error.message } });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Jimenez Motors server listening on port ${port}`);
});

function sanitizeIdentifier(identifier) {
  if (identifier === '*') return '*';
  if (typeof identifier !== 'string' || !identifier.trim()) {
    throw new Error('Invalid identifier');
  }
  const trimmed = identifier.trim();
  if (!/^([a-zA-Z0-9_]+)(\.[a-zA-Z0-9_]+)*$/.test(trimmed)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return trimmed
    .split('.')
    .map(part => `\`${part}\``)
    .join('.');
}

function parseColumns(columns) {
  if (!columns || columns === '*') {
    return '*';
  }

  const list = Array.isArray(columns)
    ? columns
    : String(columns)
        .split(',')
        .map(col => col.trim())
        .filter(Boolean);

  if (!list.length) {
    return '*';
  }

  return list.map(sanitizeIdentifier).join(', ');
}

function buildWhereClause(filters = []) {
  if (!filters || !filters.length) {
    return { clause: '', params: [] };
  }

  const clauses = [];
  const params = [];

  for (const filter of filters) {
    if (!filter || !filter.type || !filter.column) continue;

    const column = sanitizeIdentifier(filter.column);

    switch (filter.type) {
      case 'eq':
        clauses.push(`${column} = ?`);
        params.push(filter.value);
        break;
      default:
        throw new Error(`Unsupported filter type: ${filter.type}`);
    }
  }

  if (!clauses.length) {
    return { clause: '', params: [] };
  }

  return { clause: 'WHERE ' + clauses.join(' AND '), params };
}

function buildOrderClause(order = []) {
  if (!order || !order.length) {
    return '';
  }

  const clauses = order
    .filter(rule => rule && rule.column)
    .map(rule => `${sanitizeIdentifier(rule.column)} ${rule.ascending === false ? 'DESC' : 'ASC'}`);

  if (!clauses.length) {
    return '';
  }

  return 'ORDER BY ' + clauses.join(', ');
}

async function executeQuery(payload) {
  const { table, action } = payload;
  const safeTable = sanitizeIdentifier(table);

  switch (action) {
    case 'select':
      return executeSelect(safeTable, payload);
    case 'insert':
      return executeInsert(safeTable, payload);
    case 'update':
      return executeUpdate(safeTable, payload);
    case 'delete':
      return executeDelete(safeTable, payload);
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

async function executeSelect(table, payload) {
  const columns = parseColumns(payload.columns);
  const { clause, params } = buildWhereClause(payload.filters);
  const orderClause = buildOrderClause(payload.order);

  let sql = `SELECT ${columns} FROM ${table}`;
  if (clause) sql += ` ${clause}`;
  if (orderClause) sql += ` ${orderClause}`;

  const limit = payload.limit === undefined || payload.limit === null ? null : Number(payload.limit);
  const offset = payload.offset === undefined || payload.offset === null ? null : Number(payload.offset);

  if (Number.isFinite(limit)) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  if (Number.isFinite(offset)) {
    if (!Number.isFinite(limit)) {
      // MySQL requires LIMIT before OFFSET; set a large limit if missing
      sql += ' LIMIT 18446744073709551615';
    }
    sql += ' OFFSET ?';
    params.push(offset);
  }

  const [rows] = await pool.query(sql, params);
  if (payload.single) {
    return rows[0] || null;
  }
  return rows;
}

async function executeInsert(table, payload) {
  const records = Array.isArray(payload.data) ? payload.data : [];
  if (!records.length) {
    throw new Error('Insert payload must include data');
  }

  const columns = Object.keys(records[0]);
  if (!columns.length) {
    throw new Error('Insert data must include at least one column');
  }

  const sanitizedColumns = columns.map(sanitizeIdentifier);
  const placeholders = '(' + columns.map(() => '?').join(', ') + ')';
  const values = [];

  for (const record of records) {
    const row = columns.map(column => record[column]);
    values.push(...row);
  }

  const sql = `INSERT INTO ${table} (${sanitizedColumns.join(', ')}) VALUES ${
    records.map(() => placeholders).join(', ')
  }`;

  const [result] = await pool.query(sql, values);

  if (payload.returning) {
    const returningColumns = parseColumns(payload.returning);
    const firstId = Number(result.insertId);
    const count = Number(result.affectedRows);

    if (Number.isFinite(firstId) && Number.isFinite(count) && count > 0) {
      const ids = Array.from({ length: count }, (_, idx) => firstId + idx);
      const [rows] = await pool.query(
        `SELECT ${returningColumns} FROM ${table} WHERE ${sanitizeIdentifier('id')} IN (${ids
          .map(() => '?')
          .join(', ')})`,
        ids
      );
      return rows;
    }

    return records;
  }

  return { insertedCount: result.affectedRows };
}

async function executeUpdate(table, payload) {
  const updates = payload.data || {};
  const columns = Object.keys(updates);
  if (!columns.length) {
    throw new Error('Update payload must include fields to update');
  }

  const sets = columns.map(column => `${sanitizeIdentifier(column)} = ?`);
  const values = columns.map(column => updates[column]);

  const { clause, params } = buildWhereClause(payload.filters);
  if (!clause) {
    throw new Error('Update operations require at least one filter');
  }

  const sql = `UPDATE ${table} SET ${sets.join(', ')} ${clause}`;
  const [result] = await pool.query(sql, [...values, ...params]);
  return { updatedCount: result.affectedRows };
}

async function executeDelete(table, payload) {
  const { clause, params } = buildWhereClause(payload.filters);
  if (!clause) {
    throw new Error('Delete operations require at least one filter');
  }

  const sql = `DELETE FROM ${table} ${clause}`;
  const [result] = await pool.query(sql, params);
  return { deletedCount: result.affectedRows };
}
