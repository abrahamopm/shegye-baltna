const querystring = require('querystring');

function send(res, statusCode, body, contentType = 'text/html; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function json(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data, null, 2), 'application/json; charset=utf-8');
}

function notFound(res) {
  send(res, 404, '<h1>404 Not Found</h1>');
}

function unauthorized(res, req) {
  const accept = req.headers.accept || '';
  res.setHeader('WWW-Authenticate', 'Basic realm="Archline Admin", charset="UTF-8"');
  if (accept.includes('application/json')) {
    return json(res, 401, { ok: false, error: 'Authentication required.' });
  }
  return send(res, 401, '<h1>401 Unauthorized</h1><p>Admin authentication required.</p>');
}

function isHtmlPreferred(req) {
  const accept = req.headers.accept || '';
  return accept.includes('text/html') || accept.includes('*/*') || accept === '';
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(rawBody, contentType) {
  if (!rawBody) return {};
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawBody);
    } catch {
      return {};
    }
  }
  return querystring.parse(rawBody);
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

function safeJsonParse(value, fallback = null) {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  send,
  json,
  notFound,
  unauthorized,
  isHtmlPreferred,
  readRequestBody,
  parseBody,
  toBoolean,
  safeJsonParse,
};
