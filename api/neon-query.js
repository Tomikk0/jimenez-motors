import { neon } from '@neondatabase/serverless';

const connectionString = process.env.NEON_DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).json({ data: null, error: { message: 'Csak POST kérések engedélyezettek.' } });
    return;
  }

  if (!sql) {
    res.status(200).json({ data: null, error: { message: 'A NEON_DATABASE_URL környezeti változó nincs beállítva.' } });
    return;
  }

  try {
    const {
      table,
      action,
      columns = '*',
      payload = null,
      filters = [],
      orders = [],
      expect = 'many',
      returning = null
    } = req.body || {};

    if (!table || !action) {
      res.status(200).json({ data: null, error: { message: 'Hiányzik a tábla vagy a művelet.' } });
      return;
    }

    const { text, values } = buildSql({ table, action, columns, payload, filters, orders, returning });
    const rows = await sql.unsafe(text, values);

    const { data, error } = formatResult(rows, expect);
    if (error) {
      res.status(200).json({ data: null, error });
      return;
    }

    res.status(200).json({ data, error: null });
  } catch (error) {
    console.error('Neon API hiba:', error);
    res.status(200).json({ data: null, error: { message: error.message || 'Ismeretlen szerver hiba.' } });
  }
}

function buildSql({ table, action, columns, payload, filters, orders, returning }) {
  const values = [];
  const quotedTable = quoteIdentifier(table);
  const whereClauses = filters.map(filter => buildFilter(filter, values));

  let text = '';

  switch (action) {
    case 'select': {
      const columnList = formatColumns(columns);
      text = `SELECT ${columnList} FROM ${quotedTable}`;
      break;
    }
    case 'insert': {
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error('Az INSERT művelethez kötelező megadni az adatokat.');
      }

      const columnNames = Object.keys(payload[0]);
      if (columnNames.length === 0) {
        throw new Error('Az INSERT művelet nem tartalmaz oszlopokat.');
      }

      const quotedColumns = columnNames.map(quoteIdentifier).join(', ');
      const valueRows = payload.map(row => {
        return `(${columnNames.map(column => {
          values.push(row[column]);
          return `$${values.length}`;
        }).join(', ')})`;
      }).join(', ');

      text = `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES ${valueRows}`;
      break;
    }
    case 'update': {
      if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
        throw new Error('Az UPDATE művelethez kötelező megadni az adatokat.');
      }

      const setClauses = Object.entries(payload).map(([column, value]) => {
        values.push(value);
        return `${quoteIdentifier(column)} = $${values.length}`;
      }).join(', ');

      text = `UPDATE ${quotedTable} SET ${setClauses}`;
      break;
    }
    case 'delete': {
      text = `DELETE FROM ${quotedTable}`;
      break;
    }
    default:
      throw new Error(`Ismeretlen művelet: ${action}`);
  }

  if (whereClauses.length > 0) {
    text += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  if (action === 'select' && orders.length > 0) {
    const orderClause = orders
      .map(({ column, ascending }) => `${quoteIdentifier(column)} ${ascending === false ? 'DESC' : 'ASC'}`)
      .join(', ');
    text += ` ORDER BY ${orderClause}`;
  }

  if (['insert', 'update', 'delete'].includes(action)) {
    text += buildReturningClause(action, returning);
  }

  return { text, values };
}

function buildReturningClause(action, returning) {
  if (!['insert', 'update', 'delete'].includes(action)) {
    return '';
  }

  if (returning === null || returning === 'minimal') {
    return '';
  }

  const columnList = returning && returning !== '*' ? formatColumns(returning) : '*';
  return ` RETURNING ${columnList}`;
}

function buildFilter(filter, values) {
  if (!filter || filter.operator !== 'eq') {
    throw new Error(`Nem támogatott szűrő: ${filter?.operator || 'ismeretlen'}`);
  }

  if (filter.value === null || filter.value === undefined) {
    return `${quoteIdentifier(filter.column)} IS NULL`;
  }

  values.push(filter.value);
  return `${quoteIdentifier(filter.column)} = $${values.length}`;
}

function formatColumns(columns) {
  if (!columns || columns === '*') {
    return '*';
  }

  return columns
    .split(',')
    .map(column => column.trim())
    .filter(Boolean)
    .map(quoteIdentifier)
    .join(', ');
}

function quoteIdentifier(identifier) {
  if (!identifier) {
    throw new Error('Hiányzó oszlop- vagy táblanév.');
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function formatResult(rows, expect) {
  if (expect === 'single') {
    if (!rows || rows.length === 0) {
      return { data: null, error: { message: 'Nem található adat a megadott feltételekkel.' } };
    }
    if (rows.length > 1) {
      return { data: null, error: { message: 'Több rekord érkezett, mint várt.' } };
    }
    return { data: rows[0], error: null };
  }

  if (expect === 'maybeSingle') {
    if (!rows || rows.length === 0) {
      return { data: null, error: null };
    }
    if (rows.length > 1) {
      return { data: null, error: { message: 'Több rekord érkezett, mint várt.' } };
    }
    return { data: rows[0], error: null };
  }

  return { data: rows || [], error: null };
}
