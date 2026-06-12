const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const dataFile = path.join(root, 'data', 'site-content.json');
const uploadDir = path.join(root, 'uploads');
const port = Number(process.env.PORT || 5500);

fs.mkdirSync(path.dirname(dataFile), { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendJson(res, status, value) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([/\\])+/, '');
  const filePath = path.join(root, normalized || 'index.html');
  if (!filePath.startsWith(root)) return null;
  return filePath;
}

function sanitizeFileName(name) {
  const ext = path.extname(name || '').toLowerCase();
  const base = path.basename(name || 'upload', ext).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'upload';
  return `${base}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
}

function parseContentDisposition(header) {
  const result = {};
  header.split(';').forEach(part => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey || !rawValue.length) return;
    const key = rawKey.toLowerCase();
    const value = rawValue.join('=').trim().replace(/^"|"$/g, '');
    result[key] = value;
  });
  return result;
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:(?:"([^"]+)")|([^;]+))/i.exec(contentType || '');
  if (!match) throw new Error('Missing multipart boundary');

  const boundaryText = '--' + (match[1] || match[2]);
  const boundary = Buffer.from(boundaryText, 'utf8');
  const separator = Buffer.from('\r\n\r\n');
  const lineBreak = Buffer.from('\r\n');
  const parts = [];
  let cursor = buffer.indexOf(boundary);

  while (cursor !== -1) {
    cursor += boundary.length;
    if (buffer[cursor] === 45 && buffer[cursor + 1] === 45) break;
    if (buffer[cursor] === 13 && buffer[cursor + 1] === 10) cursor += 2;

    const headerEnd = buffer.indexOf(separator, cursor);
    if (headerEnd === -1) break;

    const headerText = buffer.slice(cursor, headerEnd).toString('utf8');
    const headers = Object.fromEntries(headerText.split(/\r?\n/).map(line => {
      const index = line.indexOf(':');
      if (index === -1) return ['', ''];
      return [line.slice(0, index).trim().toLowerCase(), line.slice(index + 1).trim()];
    }).filter(([key]) => key));

    const disposition = parseContentDisposition(headers['content-disposition'] || '');
    const bodyStart = headerEnd + separator.length;
    const nextBoundary = buffer.indexOf(boundary, bodyStart);
    if (nextBoundary === -1) break;

    let bodyEnd = nextBoundary;
    if (buffer[bodyEnd - 2] === 13 && buffer[bodyEnd - 1] === 10) bodyEnd -= 2;

    if (disposition.name) {
      parts.push({
        name: disposition.name,
        filename: disposition.filename,
        contentType: headers['content-type'] || '',
        data: buffer.slice(bodyStart, bodyEnd)
      });
    }

    cursor = nextBoundary;
    if (buffer[cursor - 2] === lineBreak[0] && buffer[cursor - 1] === lineBreak[1]) {
      cursor = nextBoundary;
    }
  }

  return parts;
}
async function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/content') {
    return fs.promises.readFile(dataFile, 'utf8').then(data => send(res, 200, data, 'application/json; charset=utf-8'));
  }

  if (req.method === 'POST' && req.url === '/api/content') {
    const body = await readBody(req);
    try {
      const parsed = JSON.parse(body.toString('utf8'));
      await fs.promises.writeFile(dataFile, JSON.stringify(parsed, null, 2), 'utf8');
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/api/upload') {
    try {
      const body = await readBody(req);
      const parts = parseMultipart(body, req.headers['content-type']);
      const file = parts.find(part => part.filename && part.data.length);
      if (!file) return sendJson(res, 400, { ok: false, error: 'No file uploaded' });

      const fileName = sanitizeFileName(file.filename);
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, file.data);
      return sendJson(res, 200, { ok: true, path: `uploads/${fileName}` });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'API route not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/')) return await handleApi(req, res);

    let filePath = safePath(req.url === '/' ? '/index.html' : req.url);
    if (!filePath) return send(res, 403, 'Forbidden');

    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat) return send(res, 404, 'Not found');
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

server.listen(port, () => {
  console.log(`GOKidz local admin server running at http://localhost:${port}`);
  console.log(`Admin login: http://localhost:${port}/signup-admin.html`);
});

