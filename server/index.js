const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const { spawn } = require('child_process');

ensureWorkingDirectory();

loadEnv();

function ensureWorkingDirectory() {
  try {
    process.cwd();
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const fallback = path.resolve(__dirname, '..');
      try {
        process.chdir(fallback);
        console.warn('Working directory was missing; switched to', fallback);
      } catch (chdirError) {
        console.error('Failed to recover working directory:', chdirError.message);
      }
    } else {
      console.error('Unexpected error while reading working directory:', error.message);
    }
  }
}

const PORT = Number(process.env.PORT || 3000);
const MYSQL_CMD = process.env.MYSQL_CLIENT || 'mysql';
const REQUEST_LIMIT = Number(process.env.REQUEST_LIMIT || 15 * 1024 * 1024);

const dbConfig = {
  host: process.env.MARIADB_HOST || 'localhost',
  port: Number(process.env.MARIADB_PORT || 3306),
  user: process.env.MARIADB_USER || 'root',
  password: process.env.MARIADB_PASSWORD || '',
  database: process.env.MARIADB_DATABASE || 'jimenez_motors'
};

const allowedTables = new Set([
  'cars',
  'app_users',
  'member_history',
  'members',
  'badges',
  'tuning_options',
  'car_models'
]);

const rootDir = path.resolve(__dirname, '..');

const server = http.createServer(async (req, res) => {
  enableCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = parsedUrl;

  if (req.method === 'GET' && pathname === '/api/health') {
    return respondHealth(res);
  }

  if (req.method === 'POST' && pathname === '/api/query') {
    try {
      const body = await readJsonBody(req, REQUEST_LIMIT);
      const result = await handleQuery(body);
      sendJson(res, 200, { data: result.data, error: null });
    } catch (error) {
      console.error('Database error:', error);
      const status = error.statusCode || 400;
      sendJson(res, status, { data: null, error: { message: error.message } });
    }
    return;
  }

  serveStatic(pathname, res);
});

server.listen(PORT, () => {
  console.log(`Jimenez Motors server listening on port ${PORT}`);
});

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      if (!line || line.trim().startsWith('#')) {
        return;
      }
      const index = line.indexOf('=');
      if (index === -1) {
        return;
      }
      const key = line.slice(0, index).trim();
      if (!key || process.env[key] !== undefined) {
        return;
      }
      const value = line.slice(index + 1).trim();
      process.env[key] = value;
    });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Failed to read .env file:', error.message);
    }
  }
}

function enableCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readJsonBody(req, limit) {
  return new Promise((resolve, reject) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      resolve({});
      return;
    }

    let received = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > limit) {
        reject(createHttpError(413, 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(body));
      } catch (error) {
        reject(createHttpError(400, 'Invalid JSON payload'));
      }
    });

    req.on('error', (error) => {
      reject(createHttpError(400, error.message));
    });
  });
}

function serveStatic(requestPath, res) {
  const safePath = requestPath.replace(/\.\./g, '');
  let filePath = path.join(rootDir, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        const indexPath = path.join(rootDir, 'index.html');
        fs.readFile(indexPath, (fallbackError, fallbackData) => {
          if (fallbackError) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': getMimeType(indexPath) });
          res.end(fallbackData);
        });
        return;
      }

      res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
      res.end(data);
    });
  });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function respondHealth(res) {
  try {
    await runMysql('SELECT 1 AS ok');
    sendJson(res, 200, { status: 'ok' });
  } catch (error) {
    sendJson(res, 500, { error: { message: error.message } });
  }
}

async function handleQuery(body) {
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
  } = body || {};

  if (!allowedTables.has(table)) {
    throw createHttpError(400, 'Invalid table requested');
  }

  const sanitizedColumns = sanitizeColumns(columns);
  switch (operation) {
    case 'select': {
      const whereClause = buildWhereClause(filters);
      const orderClause = buildOrderClause(order);
      let query = `SELECT ${sanitizedColumns} FROM \`${table}\``;
      if (whereClause) {
        query += ` ${whereClause}`;
      }
      if (orderClause) {
        query += ` ${orderClause}`;
      }
      const limitValue = Number(limit);
      if (!Number.isNaN(limitValue) && Number.isFinite(limitValue)) {
        query += ` LIMIT ${limitValue}`;
      }
      const rows = await runMysql(query);
      return { data: single ? (rows[0] || null) : rows };
    }
    case 'insert': {
      if (!Array.isArray(data) || data.length === 0) {
        throw createHttpError(400, 'Insert data must be a non-empty array');
      }
      const keys = Object.keys(data[0] || {});
      if (keys.length === 0) {
        throw createHttpError(400, 'Insert payload must contain at least one column');
      }
      const sanitizedKeys = keys.map((key) => `\`${sanitizeIdentifier(key)}\``);
      const valuesClause = data
        .map((row) => `(${keys.map((key) => escapeValue(row[key])).join(', ')})`)
        .join(', ');
      const insertSql = `INSERT INTO \`${table}\` (${sanitizedKeys.join(', ')}) VALUES ${valuesClause}; SELECT ROW_COUNT() AS affected;`;
      const resultSets = await runMysql(insertSql, { multi: true });
      const affected = readAffectedRows(resultSets);

      if (returning) {
        const rows = await fetchRecentRows(table, sanitizedColumns, data.length);
        return { data: single ? (rows[0] || null) : rows };
      }

      return { data: { inserted: affected } };
    }
    case 'update': {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw createHttpError(400, 'Update data must be an object');
      }
      if (!Array.isArray(filters) || filters.length === 0) {
        throw createHttpError(400, 'Update operations require at least one filter');
      }
      const setClauses = Object.entries(data).map(([key, value]) => `\`${sanitizeIdentifier(key)}\` = ${escapeValue(value)}`);
      const whereClause = buildWhereClause(filters);
      const updateSql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} ${whereClause}; SELECT ROW_COUNT() AS affected;`;
      const resultSets = await runMysql(updateSql, { multi: true });
      const affected = readAffectedRows(resultSets);

      if (returning) {
        const orderClause = buildOrderClause(order);
        let selectSql = `SELECT ${sanitizedColumns} FROM \`${table}\` ${whereClause}`;
        if (orderClause) {
          selectSql += ` ${orderClause}`;
        }
        const rows = await runMysql(selectSql);
        return { data: single ? (rows[0] || null) : rows };
      }

      return { data: { updated: affected > 0 } };
    }
    case 'delete': {
      if (!Array.isArray(filters) || filters.length === 0) {
        throw createHttpError(400, 'Delete operations require at least one filter');
      }
      const whereClause = buildWhereClause(filters);
      const deleteSql = `DELETE FROM \`${table}\` ${whereClause}; SELECT ROW_COUNT() AS affected;`;
      const resultSets = await runMysql(deleteSql, { multi: true });
      const affected = readAffectedRows(resultSets);
      return { data: { deleted: affected } };
    }
    default:
      throw createHttpError(400, 'Unsupported operation');
  }
}

async function fetchRecentRows(table, columns, count) {
  const limitValue = Math.max(Number(count) || 1, 1);
  const query = `SELECT ${columns} FROM \`${table}\` ORDER BY \`id\` DESC LIMIT ${limitValue}`;
  const rows = await runMysql(query);
  return rows.reverse();
}

function sanitizeIdentifier(identifier) {
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    throw createHttpError(400, 'Invalid identifier');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw createHttpError(400, `Invalid identifier: ${identifier}`);
  }
  return identifier;
}

function sanitizeColumns(columnString) {
  if (!columnString || columnString.trim() === '' || columnString.trim() === '*') {
    return '*';
  }
  const columns = columnString
    .split(',')
    .map((col) => col.trim())
    .filter(Boolean)
    .map((col) => `\`${sanitizeIdentifier(col)}\``);
  return columns.join(', ');
}

function buildWhereClause(filters = []) {
  if (!Array.isArray(filters) || filters.length === 0) {
    return '';
  }
  const clauses = filters.map((filter) => {
    const column = sanitizeIdentifier(filter.column);
    switch (filter.operator) {
      case 'eq':
        return `\`${column}\` = ${escapeValue(filter.value)}`;
      default:
        throw createHttpError(400, `Unsupported filter operator: ${filter.operator}`);
    }
  });
  return `WHERE ${clauses.join(' AND ')}`;
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

function escapeValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  const str = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
  return `'${str}'`;
}

async function runMysql(sql, options = {}) {
  const statements = options.multi ? sql : `${sql};`;
  const args = [
    `-h${dbConfig.host}`,
    `-P${dbConfig.port}`,
    `-u${dbConfig.user}`,
    `-D${dbConfig.database}`,
    '--batch',
    '--raw',
    '--default-character-set=utf8mb4',
    '-e',
    statements
  ];

  const env = { ...process.env };
  if (dbConfig.password) {
    env.MYSQL_PWD = dbConfig.password;
  }

  return new Promise((resolve, reject) => {
    const child = spawn(MYSQL_CMD, args, { env });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      reject(createHttpError(500, error.message));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const message = stderr.trim() || `mysql exited with code ${code}`;
        reject(createHttpError(500, message));
        return;
      }

      try {
        const resultSets = parseMysqlOutput(stdout);
        if (options.multi) {
          resolve(resultSets);
        } else {
          resolve(resultSets[0] || []);
        }
      } catch (error) {
        reject(createHttpError(500, error.message));
      }
    });
  });
}

function parseMysqlOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  const sections = trimmed
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.map(parseSection);
}

function parseSection(section) {
  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !/^\(.* sec\)$/.test(line));

  if (lines.length === 0) {
    return [];
  }

  const columns = lines[0].split('\t').map((col) => col.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = {};
    columns.forEach((col, index) => {
      row[col] = parseMysqlValue(values[index]);
    });
    return row;
  });

  return rows;
}

function parseMysqlValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === 'NULL') {
    return null;
  }
  if (/^-?\d+$/.test(trimmed)) {
    const intVal = Number(trimmed);
    if (Number.isSafeInteger(intVal)) {
      return intVal;
    }
  }
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    const floatVal = Number(trimmed);
    if (!Number.isNaN(floatVal)) {
      return floatVal;
    }
  }
  return trimmed;
}

function readAffectedRows(resultSets) {
  if (!Array.isArray(resultSets) || resultSets.length === 0) {
    return 0;
  }
  const lastSet = resultSets[resultSets.length - 1];
  const row = Array.isArray(lastSet) && lastSet.length > 0 ? lastSet[0] : null;
  if (!row) {
    return 0;
  }
  const value = row.affected ?? row.ROW_COUNT ?? row.row_count;
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
