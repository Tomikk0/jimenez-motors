import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';

const PORT = process.env.PORT || 8787;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  A DATABASE_URL nincs beállítva. Állítsd be az .env fájlban vagy a környezetben.');
}

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '6mb' }));

const ALLOWED_TABLES = new Set([
  'cars',
  'members',
  'member_history',
  'tuning_options',
  'badges',
  'car_models',
  'app_users'
]);

function ensureClient() {
  if (!sql) {
    throw new Error('DATABASE_URL is not configured');
  }
  return sql;
}

function ensureAllowedTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Nem engedélyezett tábla: ${table}`);
  }
  return table;
}

function escapeIdentifier(identifier) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Érvénytelen oszlop vagy tábla név: ${identifier}`);
  }
  return `"${identifier}"`;
}

function sanitizeColumns(columns) {
  if (!columns || columns === '*') {
    return '*';
  }
  const list = columns
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (!list.length) {
    return '*';
  }

  return list.map(escapeIdentifier).join(', ');
}

function parseFilters(query) {
  return Object.entries(query)
    .filter(([key]) => key.startsWith('eq_'))
    .map(([key, rawValue]) => ({
      column: key.slice(3),
      value: Array.isArray(rawValue) ? rawValue[0] : rawValue
    }));
}

function normalizeInputValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'null') return null;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (/^-?\d+$/.test(trimmed)) {
      const asNumber = Number(trimmed);
      if (Number.isSafeInteger(asNumber)) {
        return asNumber;
      }
    }
  }
  return value;
}

function buildFilterClause(filters, offset = 0) {
  if (!filters.length) {
    return '';
  }

  const conditions = filters.map((filter, index) => `${escapeIdentifier(filter.column)} = $${offset + index + 1}`);
  return `where ${conditions.join(' and ')}`;
}

function parseOrder(orderParam) {
  const values = Array.isArray(orderParam) ? orderParam : orderParam ? [orderParam] : [];
  return values
    .map(value => {
      if (typeof value !== 'string' || !value) return null;
      const [column, directionRaw] = value.split('.');
      if (!column) return null;
      const direction = directionRaw && directionRaw.toLowerCase() === 'desc' ? 'desc' : 'asc';
      return `${escapeIdentifier(column)} ${direction}`;
    })
    .filter(Boolean);
}

function normalizeRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.rows)) return result.rows;
  return [];
}

app.get('/api/:table', async (req, res) => {
  try {
    const table = ensureAllowedTable(req.params.table);
    const filters = parseFilters(req.query);
    const orderClause = parseOrder(req.query.order);
    const columns = sanitizeColumns(req.query.columns);

    const filterValues = filters.map(filter => normalizeInputValue(filter.value));
    const whereClause = buildFilterClause(filters);
    const orderSql = orderClause.length ? `order by ${orderClause.join(', ')}` : '';

    const query = [`select ${columns} from ${escapeIdentifier(table)}`, whereClause, orderSql]
      .filter(Boolean)
      .join(' ');

    const rows = await ensureClient()(query, filterValues);
    res.json(normalizeRows(rows));
  } catch (error) {
    console.error('GET hiba:', error);
    res.status(500).json({ message: 'Lekérdezés sikertelen', detail: error.message });
  }
});

app.post('/api/:table', async (req, res) => {
  try {
    const table = ensureAllowedTable(req.params.table);
    const returning = req.query.returning === 'representation';

    const rows = Array.isArray(req.body) ? req.body : req.body ? [req.body] : [];
    if (!rows.length) {
      return res.status(400).json({ message: 'A kérésnek tartalmaznia kell beszúrandó adatokat' });
    }

    const columns = [...new Set(rows.flatMap(row => Object.keys(row || {})))];
    if (!columns.length) {
      return res.status(400).json({ message: 'Nincs beszúrandó mező' });
    }

    const sanitizedColumns = columns.map(escapeIdentifier).join(', ');

    const values = [];
    const placeholders = rows
      .map(row => {
        const currentRow = columns.map(column => {
          values.push(normalizeInputValue(row[column] ?? null));
          return `$${values.length}`;
        });
        return `(${currentRow.join(', ')})`;
      })
      .join(', ');

    let query = `insert into ${escapeIdentifier(table)} (${sanitizedColumns}) values ${placeholders}`;
    if (returning) {
      query += ' returning *';
    }

    const result = await ensureClient()(query, values);
    const insertedRows = normalizeRows(result);

    if (returning) {
      res.status(201).json(insertedRows);
    } else {
      res.status(201).json({ inserted: insertedRows.length || rows.length });
    }
  } catch (error) {
    console.error('POST hiba:', error);
    res.status(500).json({ message: 'Beszúrás sikertelen', detail: error.message });
  }
});

app.patch('/api/:table', async (req, res) => {
  try {
    const table = ensureAllowedTable(req.params.table);
    const returning = req.query.returning === 'representation';
    const filters = parseFilters(req.query);

    if (!filters.length) {
      return res.status(400).json({ message: 'A módosításhoz adj meg legalább egy szűrőt (eq_*)' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'A módosítási adatok formátuma érvénytelen' });
    }

    const entries = Object.entries(req.body);
    if (!entries.length) {
      return res.status(400).json({ message: 'Nincs módosítandó mező' });
    }

    const setClauses = entries.map(([column], index) => `${escapeIdentifier(column)} = $${index + 1}`);
    const filterValues = filters.map(filter => normalizeInputValue(filter.value));
    const updateValues = entries.map(([, value]) => normalizeInputValue(value));
    const whereClause = buildFilterClause(filters, entries.length);

    let query = `update ${escapeIdentifier(table)} set ${setClauses.join(', ')} ${whereClause} returning *`;

    const result = await ensureClient()(query, [...updateValues, ...filterValues]);
    const updatedRows = normalizeRows(result);

    if (returning) {
      res.json(updatedRows);
    } else {
      res.json({ updated: updatedRows.length });
    }
  } catch (error) {
    console.error('PATCH hiba:', error);
    res.status(500).json({ message: 'Frissítés sikertelen', detail: error.message });
  }
});

app.delete('/api/:table', async (req, res) => {
  try {
    const table = ensureAllowedTable(req.params.table);
    const returning = req.query.returning === 'representation';
    const filters = parseFilters(req.query);

    if (!filters.length) {
      return res.status(400).json({ message: 'A törléshez adj meg legalább egy szűrőt (eq_*)' });
    }

    const filterValues = filters.map(filter => normalizeInputValue(filter.value));
    const whereClause = buildFilterClause(filters);

    let query = `delete from ${escapeIdentifier(table)} ${whereClause} returning *`;

    const result = await ensureClient()(query, filterValues);
    const deletedRows = normalizeRows(result);

    if (returning) {
      res.json(deletedRows);
    } else {
      res.json({ deleted: deletedRows.length });
    }
  } catch (error) {
    console.error('DELETE hiba:', error);
    res.status(500).json({ message: 'Törlés sikertelen', detail: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Nem található' });
});

app.listen(PORT, () => {
  console.log(`🚀 Jimenez Motors API elindult a ${PORT} porton`);
});
