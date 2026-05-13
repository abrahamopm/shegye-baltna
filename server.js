const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const {
  ROOT,
  ensureStorage,
  loadMessages,
  loadOrders,
  loadProductsData,
  saveMessages,
  saveOrders,
} = require('./server/storage');

const {
  isAdminAuthorized
} = require('./server/auth');

const {
  renderAdminDashboard
} = require('./server/admin-renderer');

const {
  handleContactPost,
  handleProductUpsert,
  handleProductDelete,
  handleOrderPost,
  handleProductsBulkSave
} = require('./server/handlers');

const {
  send,
  json,
  notFound,
  unauthorized
} = require('./server/utils');

const {
  sendOrderApprovalEmail
} = require('./server/email');

const PORT = Number(process.env.PORT || 3000);

function sendStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  if (relativePath.endsWith('/')) {
    relativePath += 'index.html';
  }

  const withoutLeadingSlashes = relativePath.replace(/^[/\\]+/, '');
  let decodedPath = withoutLeadingSlashes;
  try {
    decodedPath = decodeURIComponent(withoutLeadingSlashes);
  } catch {
    decodedPath = withoutLeadingSlashes;
  }
  const normalized = path.normalize(decodedPath).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(ROOT, normalized);
  const safeRoot = path.resolve(ROOT);
  const safeTarget = path.resolve(filePath);

  if (!safeTarget.startsWith(safeRoot) || !fs.existsSync(safeTarget) || fs.statSync(safeTarget).isDirectory()) {
    return notFound(res);
  }

  const ext = path.extname(safeTarget).toLowerCase();
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
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  fs.createReadStream(safeTarget).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    // Health check
    if (req.method === 'GET' && pathname === '/healthz') {
      return json(res, 200, { ok: true });
    }

    // Public API
    if (req.method === 'GET' && pathname === '/products') {
      return json(res, 200, loadProductsData());
    }

    if (req.method === 'POST' && pathname === '/api/contact') {
      return handleContactPost(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/orders') {
      return handleOrderPost(req, res);
    }

    // Admin Routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/products')) {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }

      if (req.method === 'GET' && pathname === '/admin') {
        return send(res, 200, renderAdminDashboard(loadMessages(), loadOrders()));
      }

      if (req.method === 'POST' && pathname === '/api/products') {
        return handleProductUpsert(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/products/bulk') {
        return handleProductsBulkSave(req, res);
      }

      if (req.method === 'POST' && pathname === '/api/products/delete') {
        return handleProductDelete(req, res);
      }

      // Admin actions (Mark as read, delete message, order status)
      if (req.method === 'POST' && pathname.startsWith('/admin/messages/') && pathname.endsWith('/read')) {
        const messageId = decodeURIComponent(pathname.slice('/admin/messages/'.length, -'/read'.length));
        const messages = loadMessages();
        const idx = messages.findIndex(m => m.id === messageId);
        if (idx !== -1) {
          messages[idx].readAt = new Date().toISOString();
          saveMessages(messages);
        }
        res.writeHead(303, { Location: '/admin?tab=messages' });
        return res.end();
      }

      if (req.method === 'POST' && pathname.startsWith('/admin/messages/') && pathname.endsWith('/delete')) {
        const messageId = decodeURIComponent(pathname.slice('/admin/messages/'.length, -'/delete'.length));
        const messages = loadMessages().filter(m => m.id !== messageId);
        saveMessages(messages);
        res.writeHead(303, { Location: '/admin?tab=messages' });
        return res.end();
      }

      if (req.method === 'POST' && pathname.startsWith('/admin/orders/') && pathname.endsWith('/status')) {
        const orderId = decodeURIComponent(pathname.slice('/admin/orders/'.length, -'/status'.length));
        // Simple status update logic here or move to handlers
        // ...
        res.writeHead(303, { Location: '/admin?tab=orders' });
        return res.end();
      }
    }

    // Protected data access
    if (req.method === 'GET' && pathname.startsWith('/data/uploads/')) {
      if (!isAdminAuthorized(req)) return unauthorized(res, req);
      return sendStaticFile(req, res, pathname);
    }

    if (pathname.startsWith('/data/')) return notFound(res);

    // Static files
    if (req.method === 'GET' || req.method === 'HEAD') {
      return sendStaticFile(req, res, pathname);
    }

    return send(res, 405, '<h1>405 Method Not Allowed</h1>');
  } catch (error) {
    console.error(error);
    return send(res, 500, '<h1>500 Internal Server Error</h1>');
  }
});

ensureStorage();
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
