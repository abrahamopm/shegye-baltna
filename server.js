const http = require('http');
const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const nodemailer = require('nodemailer');
const { URL } = require('url');
const querystring = require('querystring');
require('dotenv').config();

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'contact-messages.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PRODUCT_UPLOADS_DIR = path.join(ROOT, 'assets', 'uploads');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRODUCT_UPLOADS_DIR)) {
    fs.mkdirSync(PRODUCT_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, '[]\n', 'utf8');
  }
  if (!fs.existsSync(PRODUCTS_FILE)) {
    fs.writeFileSync(PRODUCTS_FILE, '{"products": []}\n', 'utf8');
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]\n', 'utf8');
  }
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, '[]\n', 'utf8');
  }
}

function loadMessages() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(MESSAGES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadJsonArray(filePath) {
  ensureStorage();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  ensureStorage();
  const tmpFile = `${MESSAGES_FILE}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(messages, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpFile, MESSAGES_FILE);
}

function saveJsonArray(filePath, data) {
  ensureStorage();
  const tmpFile = `${filePath}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpFile, filePath);
}

function loadProductsData() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products)) {
      return { products: parsed.products };
    }
    return { products: [] };
  } catch {
    return { products: [] };
  }
}

function saveProductsData(data) {
  ensureStorage();
  const safeData = data && Array.isArray(data.products) ? data : { products: [] };
  const tmpFile = `${PRODUCTS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(safeData, null, 2)}\n`, 'utf8');
  fs.renameSync(tmpFile, PRODUCTS_FILE);
}

function loadUsers() {
  return loadJsonArray(USERS_FILE);
}

function saveUsers(users) {
  saveJsonArray(USERS_FILE, users);
}

function loadOrders() {
  return loadJsonArray(ORDERS_FILE);
}

function saveOrders(orders) {
  saveJsonArray(ORDERS_FILE, orders);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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
  if (!rawBody) {
    return {};
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }

  return querystring.parse(rawBody);
}

function firstValue(source, keys) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function firstArrayValue(source, keys) {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      const cleaned = value.map((item) => String(item || '').trim()).filter(Boolean);
      if (cleaned.length) return cleaned;
    }
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
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

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      id: String(item.id || item.name || '').trim(),
      name: String(item.name || '').trim(),
      price: Number(item.price || 0),
      qty: Number(item.qty || item.quantity || 0),
      total: Number(item.total || 0),
    }))
    .filter((item) => item.name && item.qty > 0);
}

function normalizeOrderTotals(totals) {
  if (!totals || typeof totals !== 'object') return { subtotal: 0, shipping: 0, tax: 0, total: 0 };
  return {
    subtotal: Number(totals.subtotal || 0),
    shipping: Number(totals.shipping || 0),
    tax: Number(totals.tax || 0),
    total: Number(totals.total || 0),
  };
}

function normalizeOrderUser(payload) {
  const user = payload.user && typeof payload.user === 'object' ? payload.user : {};
  const shipping = payload.shipping && typeof payload.shipping === 'object' ? payload.shipping : {};
  return {
    name: String(user.name || shipping.full_name || '').trim(),
    email: String(user.email || payload.userId || shipping.email || payload.email || '').trim(),
    phone: String(user.phone || payload.phone || '').trim(),
    address: String(user.address || shipping.address || '').trim(),
  };
}

function upsertUserRecord(user) {
  if (!user.email) return null;
  const users = loadUsers();
  const now = new Date().toISOString();
  const idx = users.findIndex((u) => u.email === user.email);
  if (idx === -1) {
    users.push({
      id: user.email,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    users[idx] = {
      ...users[idx],
      name: user.name || users[idx].name,
      phone: user.phone || users[idx].phone,
      address: user.address || users[idx].address,
      updatedAt: now,
    };
  }
  saveUsers(users);
  return user.email;
}

function canSendEmail() {
  return Boolean(SMTP_USER && SMTP_PASS && SMTP_FROM);
}

async function sendOrderApprovalEmail(order) {
  if (!canSendEmail()) {
    return { ok: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const toEmail = order.user?.email || order.userId;
  if (!toEmail) {
    return { ok: false, error: 'Missing recipient email' };
  }

  const total = order.totals?.total ? `${order.totals.total} ETB` : 'your total';
  const itemsLine = Array.isArray(order.items)
    ? order.items.map((item) => `${item.qty}x ${item.name}`).join(', ')
    : '';

  await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: 'Shegye Baltna order approved',
    text: `Hello ${order.user?.name || ''},\n\nYour order has been approved.\nOrder ID: ${order.id}\nTotal: ${total}\nItems: ${itemsLine}\n\nThank you for shopping with us.`,
  });

  return { ok: true };
}

function safeFileName(value) {
  const candidate = String(value || '').replaceAll('\\', '/').split('/').pop() || '';
  const cleaned = candidate.replace(/[^\w.\-() ]+/g, '_').trim();
  return cleaned || `upload-${Date.now()}`;
}

function parseProductMultipartForm(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    let fileMeta = null;
    const fileWrites = [];

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
        fieldSize: 1024 * 1024,
      },
    });

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, stream, info) => {
      if (!info.filename) {
        stream.resume();
        return;
      }
      const originalName = safeFileName(info.filename);
      const storedName = `product-${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${originalName}`;
      const savePath = path.join(PRODUCT_UPLOADS_DIR, storedName);
      const writeStream = fs.createWriteStream(savePath);

      const writePromise = new Promise((fileResolve, fileReject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => {
          fileMeta = {
            fieldName: name,
            originalName,
            storedName,
            relativePath: path.posix.join('assets', 'uploads', storedName),
            size: writeStream.bytesWritten,
            mimeType: info.mimeType || '',
          };
          fileResolve();
        });
        writeStream.on('error', fileReject);
        stream.on('error', fileReject);
      });

      fileWrites.push(writePromise);
    });

    busboy.on('error', reject);
    busboy.on('finish', async () => {
      try {
        await Promise.all(fileWrites);
        resolve({ fields, fileMeta });
      } catch (error) {
        reject(error);
      }
    });
    req.pipe(busboy);
  });
}

function normalizeProductPayload(fields, fileMeta, existingProduct) {
  const id = String(fields.id || '').trim();
  const price = Number(fields.price || 0);
  const fallbackImage = existingProduct?.image || 'assets/images/product-jar.png';
  const imagePath = fileMeta?.relativePath || String(fields.image || '').trim() || fallbackImage;

  return {
    id,
    price,
    image: imagePath,
    featured: toBoolean(fields.featured),
    bestSeller: toBoolean(fields.bestseller),
    names: {
      en: String(fields['name-en'] || '').trim(),
      am: String(fields['name-am'] || '').trim(),
    },
    shortDescription: {
      en: String(fields['short-desc-en'] || '').trim(),
      am: String(fields['short-desc-am'] || '').trim(),
    },
    description: {
      en: String(fields['desc-en'] || '').trim(),
      am: String(fields['desc-am'] || '').trim(),
    },
    ingredients: {
      en: String(fields['ingredients-en'] || '').trim(),
      am: String(fields['ingredients-am'] || '').trim(),
    },
    culinary: {
      en: String(fields['culinary-en'] || '').trim(),
      am: String(fields['culinary-am'] || '').trim(),
    },
    shipping: {
      en: String(fields['shipping-en'] || '').trim(),
      am: String(fields['shipping-am'] || '').trim(),
    },
  };
}

function removeDirSafe(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Failed to remove directory:', dirPath, error);
  }
}

function parseMultipartForm(req, submissionId) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    const submissionDir = path.join(UPLOADS_DIR, submissionId);
    fs.mkdirSync(submissionDir, { recursive: true });

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 10,
        fileSize: 15 * 1024 * 1024,
        fieldSize: 1024 * 1024,
      },
    });

    const fileWrites = [];

    busboy.on('field', (name, value) => {
      if (Object.prototype.hasOwnProperty.call(fields, name)) {
        if (!Array.isArray(fields[name])) {
          fields[name] = [fields[name]];
        }
        fields[name].push(value);
      } else {
        fields[name] = value;
      }
    });

    busboy.on('file', (name, stream, info) => {
      const originalName = safeFileName(info.filename);
      const storedName = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${originalName}`;
      const savePath = path.join(submissionDir, storedName);
      const writeStream = fs.createWriteStream(savePath);

      const writePromise = new Promise((fileResolve, fileReject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', () => {
          files.push({
            fieldName: name,
            originalName,
            storedName,
            relativePath: path.posix.join('data', 'uploads', submissionId, storedName),
            size: writeStream.bytesWritten,
            mimeType: info.mimeType || '',
          });
          fileResolve();
        });
        writeStream.on('error', fileReject);
        stream.on('error', fileReject);
      });

      fileWrites.push(writePromise);
    });

    busboy.on('error', (error) => {
      removeDirSafe(submissionDir);
      reject(error);
    });

    busboy.on('finish', async () => {
      try {
        await Promise.all(fileWrites);
        resolve({ fields, files, submissionDir });
      } catch (error) {
        removeDirSafe(submissionDir);
        reject(error);
      }
    });

    req.pipe(busboy);
  });
}

function normalizeContactPayload(source, req, uploadedFiles = []) {
  const nestedDocuments = source.documents && typeof source.documents === 'object' ? source.documents : {};
  const preferredStates = firstArrayValue(source, ['preferredStates', 'preferred_states']);
  const uploadedByField = Object.fromEntries(uploadedFiles.map((file) => [file.fieldName, file]));
  const documentValue = (fieldName) => {
    if (uploadedByField[fieldName]) {
      return uploadedByField[fieldName];
    }
    const fallbackName = firstValue(nestedDocuments, [fieldName]) || firstValue(source, [fieldName]);
    if (!fallbackName) return null;
    return {
      fieldName,
      originalName: fallbackName,
      storedName: '',
      relativePath: '',
      size: 0,
      mimeType: '',
    };
  };

  const name = firstValue(source, ['name', 'form_fields[name]', 'form_fields%5Bname%5D']);
  const companyName = firstValue(source, ['companyName', 'company', 'field_4655bf5', 'form_fields[field_4655bf5]', 'form_fields%5Bfield_4655bf5%5D']);

  return {
    email: firstValue(source, ['email', 'form_fields[email]', 'form_fields%5Bemail%5D']),
    companyName: companyName || name,
    streetAddress: firstValue(source, ['streetAddress']),
    addressLine2: firstValue(source, ['addressLine2']),
    zipCode: firstValue(source, ['zipCode']),
    phoneNumber: firstValue(source, ['phoneNumber', 'phone', 'field_8f0b529', 'form_fields[field_8f0b529]', 'form_fields%5Bfield_8f0b529%5D']),
    mcNumber: firstValue(source, ['mcNumber']),
    usdotNumber: firstValue(source, ['usdotNumber']),
    ein: firstValue(source, ['ein']),
    tNumber: firstValue(source, ['tNumber']),
    numberOfTrucks: firstValue(source, ['numberOfTrucks']),
    numberOfDrivers: firstValue(source, ['numberOfDrivers']),
    preferredStates,
    documents: {
      mcAuthorityLetter: documentValue('mcAuthorityLetter'),
      ndaOrVoidCheck: documentValue('ndaOrVoidCheck'),
      liabilityInsurance: documentValue('liabilityInsurance'),
      w9: documentValue('w9'),
    },
    smsConsent: toBoolean(source.smsConsent),
    privacyAccepted: toBoolean(source.privacyAccepted),
    // Backward-compatible aliases for older admin views/scripts.
    name: name || companyName,
    company: firstValue(source, ['company', 'field_4655bf5', 'form_fields[field_4655bf5]', 'form_fields%5Bfield_4655bf5%5D']) || firstValue(source, ['companyName']),
    phone: firstValue(source, ['phone', 'field_8f0b529', 'form_fields[field_8f0b529]', 'form_fields%5Bfield_8f0b529%5D']) || firstValue(source, ['phoneNumber']),
    message: firstValue(source, ['message', 'form_fields[message]', 'form_fields%5Bmessage%5D']),
    userAgent: req.headers['user-agent'] || '',
    referrer: req.headers.referer || req.headers.referrer || '',
  };
}

function validateContactMessage(payload) {
  if (!payload.name && !payload.companyName) {
    return 'Name is required.';
  }
  if (!payload.email) {
    return 'Email is required.';
  }
  if (!payload.message) {
    return 'Message is required.';
  }
  return '';
}

function parseBasicAuth(headerValue) {
  if (!headerValue || !headerValue.startsWith('Basic ')) {
    return null;
  }

  try {
    const encoded = headerValue.slice(6).trim();
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    if (separator === -1) {
      return null;
    }
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function isAdminAuthorized(req) {
  const credentials = parseBasicAuth(req.headers.authorization || '');
  if (!credentials) {
    return false;
  }
  return credentials.username === ADMIN_USERNAME && credentials.password === ADMIN_PASSWORD;
}

function renderAdminDashboard(messages, orders) {
  const unreadCount = messages.filter((message) => !message.readAt).length;
  const docLinks = (documents) => {
    if (!documents || typeof documents !== 'object') return '—';
    const entries = Object.entries(documents).filter(([, file]) => file);
    if (!entries.length) return '—';
    const items = entries.map(([label, file]) => {
      if (typeof file === 'string') {
        return `<li><span class="file-label">${escapeHtml(label)}</span><span class="file-meta">${escapeHtml(file)}</span></li>`;
      }
      if (!file.relativePath) {
        return `<li><span class="file-label">${escapeHtml(label)}</span><span class="file-meta">${escapeHtml(file.originalName || 'uploaded')}</span></li>`;
      }
      const fileUrl = `/${encodeURI(file.relativePath)}`;
      return `<li>
        <span class="file-label">${escapeHtml(label)}</span>
        <a href="${fileUrl}" target="_blank" rel="noreferrer">View</a>
        <a href="${fileUrl}" download>Download</a>
      </li>`;
    }).join('');
    return `<ul class="file-list">${items}</ul>`;
  };

  const messageRows = messages
    .slice()
    .reverse()
    .map((message) => {
      const createdAt = new Date(message.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const isRead = Boolean(message.readAt);
      const statusPill = isRead
        ? '<span class="row-pill read">Read</span>'
        : '<span class="row-pill unread">Unread</span>';

      return `
        <tr class="${isRead ? 'row-read' : 'row-unread'}">
          <td>${escapeHtml(createdAt)}</td>
          <td>${statusPill}</td>
          <td>${escapeHtml(message.companyName || message.company || message.name || '—')}</td>
          <td><a href="mailto:${escapeHtml(message.email)}">${escapeHtml(message.email)}</a></td>
          <td>${escapeHtml(message.phoneNumber || message.phone || '—')}</td>
          <td>${escapeHtml(message.mcNumber || '—')}</td>
          <td>${escapeHtml(Array.isArray(message.preferredStates) ? message.preferredStates.join(', ') : '—')}</td>
          <td>${docLinks(message.documents)}</td>
          <td>
            <div class="admin-actions">
              <form method="post" action="/admin/messages/${encodeURIComponent(message.id)}/read">
                <button type="submit" ${isRead ? 'disabled' : ''}>Mark as read</button>
              </form>
              <form method="post" action="/admin/messages/${encodeURIComponent(message.id)}/delete" onsubmit="return confirm('Delete this submission and uploaded files?');">
                <button type="submit" class="danger">Delete</button>
              </form>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  const orderRows = orders
    .slice()
    .reverse()
    .map((order) => {
      const createdAt = new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const status = order.status || 'pending';
      const proof = order.payment?.proof;
      const proofHtml = proof?.relativePath
        ? `<a href="/${encodeURI(proof.relativePath)}" target="_blank" rel="noreferrer">View</a>`
        : '—';

      return `
        <tr>
          <td>${escapeHtml(createdAt)}</td>
          <td><span class="pill status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
          <td>${escapeHtml(order.user?.name || '—')}</td>
          <td><a href="mailto:${escapeHtml(order.user?.email || '')}">${escapeHtml(order.user?.email || '—')}</a></td>
          <td>${escapeHtml(order.user?.phone || '—')}</td>
          <td>${escapeHtml(order.totals?.total ? `${order.totals.total} ETB` : '—')}</td>
          <td>${escapeHtml(order.payment?.status || 'pending')}</td>
          <td>${proofHtml}</td>
          <td>
            <div class="admin-actions">
              <form method="post" action="/admin/orders/${encodeURIComponent(order.id)}/status">
                <input type="hidden" name="status" value="approved" />
                <button type="submit" ${status === 'approved' ? 'disabled' : ''}>Approve</button>
              </form>
              <form method="post" action="/admin/orders/${encodeURIComponent(order.id)}/status">
                <input type="hidden" name="status" value="denied" />
                <button type="submit" class="danger" ${status === 'denied' ? 'disabled' : ''}>Deny</button>
              </form>
            </div>
          </td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Admin | Shegye Baltna</title>
  <link rel="stylesheet" href="/index.css" />
  <style>
    body.admin-page { cursor: auto; }
    .admin-wrap { max-width: 1200px; margin: 0 auto; padding: 110px 1.5rem 4rem; }
    .admin-panel { background: var(--clr-parchment); border: 1px solid var(--clr-gold-light); border-radius: 12px; padding: 1.75rem; margin-top: 1rem; box-shadow: 0 8px 30px rgba(44,24,16,0.06); }
    .admin-hint { color: #555; line-height: 1.65; margin: 0.75rem 0 1.25rem; font-size: 0.95rem; }
    .admin-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 2px solid var(--clr-gold-light); flex-wrap: wrap; }
    .tab-btn { padding: 0.75rem 1.5rem; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: var(--clr-espresso); transition: all 0.3s ease; }
    .tab-btn:hover { background: rgba(44,24,16,0.05); }
    .tab-btn.active { border-bottom-color: var(--clr-gold); color: var(--clr-gold); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    textarea.admin-json { width: 100%; min-height: 380px; font-family: ui-monospace, Consolas, monospace; font-size: 13px; line-height: 1.45; padding: 1rem; border-radius: 8px; border: 1px solid rgba(44,24,16,0.2); background: #fff; color: var(--clr-espresso); }
    .admin-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem; align-items: center; }

    .product-form { margin-bottom: 2rem; }
    .product-form h3 { color: var(--clr-espresso); margin-bottom: 1rem; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .form-group label { font-weight: 600; color: var(--clr-espresso); }
    .form-group input, .form-group textarea { padding: 0.75rem; border: 1px solid rgba(44,24,16,0.2); border-radius: 8px; font-family: inherit; font-size: 0.95rem; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: var(--clr-gold); box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
    .form-group small { color: #666; font-size: 0.85rem; }
    .form-actions { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
    .image-input-group { display: flex; gap: 0.5rem; align-items: center; }
    .image-input-group input { flex: 1; }
    #image-preview img { max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid rgba(44,24,16,0.2); }

    .product-list { margin-top: 2rem; }
    .product-list h3 { color: var(--clr-espresso); margin-bottom: 1rem; }
    #products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .product-card { background: white; border: 1px solid rgba(44,24,16,0.1); border-radius: 8px; padding: 1rem; position: relative; }
    .product-card h4 { color: var(--clr-espresso); margin-bottom: 0.5rem; }
    .product-card .price { color: var(--clr-gold); font-weight: 600; margin-bottom: 0.5rem; }
    .product-card .product-id { color: #666; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .product-card .badges { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    .badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge.featured { background: var(--clr-gold-light); color: var(--clr-espresso); }
    .badge.bestseller { background: var(--clr-gold); color: white; }
    .product-card .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .product-card button { padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .edit-btn { background: var(--clr-gold-light); color: var(--clr-espresso); }
    .delete-btn { background: #dc3545; color: white; }
    .product-card button:hover { opacity: 0.8; }

    .table-wrap { background: #fff; border: 1px solid rgba(44,24,16,0.12); border-radius: 16px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 1050px; }
    thead { background: linear-gradient(180deg, #2e1d0f, #3f2a18); color: #fff; }
    th, td { padding: 14px 16px; text-align: left; vertical-align: top; border-bottom: 1px solid rgba(44,24,16,0.12); font-size: 0.92rem; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
    tbody tr:nth-child(even) td { background: #fbf6ef; }
    .row-unread td { background: #fff7db !important; }
    .row-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .row-pill.unread { background: #fde68a; color: #92400e; }
    .row-pill.read { background: #bbf7d0; color: #166534; }
    .pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background: #efe5d6; color: #5b4632; }
    .status-approved { background: #dcfce7; color: #15803d; }
    .status-denied { background: #fee2e2; color: #b91c1c; }
    .status-pending { background: #fef9c3; color: #a16207; }
    .admin-actions { display: grid; gap: 8px; min-width: 120px; }
    .admin-actions form { margin: 0; }
    .admin-actions button { border: 1px solid #e2d1b9; background: #fffaf3; color: #3b2a1b; border-radius: 10px; padding: 8px 12px; font-weight: 600; cursor: pointer; width: 100%; }
    .admin-actions button:disabled { opacity: 0.55; cursor: not-allowed; }
    .admin-actions .danger { border-color: #fecaca; background: #fef2f2; color: #991b1b; }
    .file-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; min-width: 280px; }
    .file-list li { display: grid; grid-template-columns: minmax(120px, 1fr) auto auto; align-items: center; gap: 8px; background: #fffaf3; border: 1px solid #f1e2cc; border-radius: 8px; padding: 6px 8px; }
    .file-label { font-weight: 600; color: #3f2a18; font-size: 0.8rem; text-transform: capitalize; }
    .file-meta { color: #7a5a3a; font-size: 0.8rem; }
    .file-list a { text-decoration: none; font-size: 0.78rem; font-weight: 700; color: #7a4b1f; background: #f9e6c8; border: 1px solid #f4d6a7; padding: 4px 7px; border-radius: 999px; }
    .empty { padding: 48px 24px; text-align: center; color: #6b5b4c; }

    @media (max-width: 900px) {
      .form-row { grid-template-columns: 1fr; }
      #products-grid { grid-template-columns: 1fr; }
      table { min-width: 980px; }
    }
  </style>
</head>
<body class="admin-page">
  <nav class="nav">
    <a href="/index.html" class="nav-logo">
      <img src="/logo.jpg" alt="Shegye Baltna Logo">
      <span>Shegye Baltna</span>
    </a>
    <div class="nav-links">
      <a href="/shop.html" class="nav-link">Spices Shop</a>
      <a href="/index.html" class="nav-link">Home</a>
    </div>
  </nav>

  <main class="admin-wrap" id="main-content" tabindex="-1">
    <h1 class="display" style="font-size: 2rem; color: var(--clr-espresso);">Admin dashboard</h1>
    <p class="admin-hint">Manage products, contact messages, and order approvals from one place.</p>

    <div class="admin-panel">
      <div class="admin-tabs">
        <button type="button" class="tab-btn" data-tab="products">Products</button>
        <button type="button" class="tab-btn" data-tab="messages">Contact messages</button>
        <button type="button" class="tab-btn" data-tab="orders">Orders</button>
      </div>

      <div id="tab-products" class="tab-content">
        <div class="product-form">
          <h3>Add/Edit Product</h3>
          <form id="product-form">
            <div class="form-row">
              <div class="form-group">
                <label for="product-id">Product ID</label>
                <input type="text" id="product-id" required>
              </div>
              <div class="form-group">
                <label for="product-price">Price (ETB)</label>
                <input type="number" id="product-price" required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="product-name-en">Name (English)</label>
                <input type="text" id="product-name-en" required>
              </div>
              <div class="form-group">
                <label for="product-name-am">Name (Amharic)</label>
                <input type="text" id="product-name-am" required>
              </div>
            </div>

            <div class="form-group">
              <label for="product-image">Image</label>
              <div class="image-input-group">
                <input type="text" id="product-image" placeholder="assets/images/spice-name.png">
                <label class="btn-secondary" style="cursor: pointer; margin: 0;">
                  Upload Image
                  <input type="file" id="image-upload" accept="image/*" hidden>
                </label>
              </div>
              <small>Enter a public image path or upload a new image (saved to assets/uploads/).</small>
              <div id="image-preview" style="margin-top: 0.5rem;"></div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>
                  <input type="checkbox" id="product-featured">
                  Featured Product
                </label>
              </div>
              <div class="form-group">
                <label>
                  <input type="checkbox" id="product-bestseller">
                  Best Seller
                </label>
              </div>
            </div>

            <div class="form-group">
              <label for="product-short-desc-en">Short Description (English)</label>
              <textarea id="product-short-desc-en" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-short-desc-am">Short Description (Amharic)</label>
              <textarea id="product-short-desc-am" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-desc-en">Full Description (English)</label>
              <textarea id="product-desc-en" rows="3" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-desc-am">Full Description (Amharic)</label>
              <textarea id="product-desc-am" rows="3" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-ingredients-en">Ingredients (English)</label>
              <textarea id="product-ingredients-en" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-ingredients-am">Ingredients (Amharic)</label>
              <textarea id="product-ingredients-am" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-culinary-en">Culinary Uses (English)</label>
              <textarea id="product-culinary-en" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-culinary-am">Culinary Uses (Amharic)</label>
              <textarea id="product-culinary-am" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-shipping-en">Shipping Info (English)</label>
              <textarea id="product-shipping-en" rows="2" required></textarea>
            </div>

            <div class="form-group">
              <label for="product-shipping-am">Shipping Info (Amharic)</label>
              <textarea id="product-shipping-am" rows="2" required></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary">Save Product</button>
              <button type="button" class="btn-secondary" id="clear-form">Clear Form</button>
            </div>
          </form>
        </div>

        <div class="product-list">
          <h3>Existing Products</h3>
          <div id="products-grid"></div>
        </div>

        <div style="margin-top: 2rem;">
          <h3>JSON Editor</h3>
          <textarea class="admin-json" id="admin-json" aria-label="Products JSON"></textarea>
          <div class="admin-actions">
            <button type="button" class="btn-primary" id="admin-save">Save to server</button>
            <button type="button" class="btn-secondary" id="admin-reset">Reload from server</button>
            <button type="button" class="btn-secondary" id="admin-download">Download JSON</button>
            <label class="btn-secondary" style="cursor: pointer; margin: 0;">
              Import file
              <input type="file" id="admin-import" accept="application/json,.json" hidden>
            </label>
          </div>
        </div>
      </div>

      <div id="tab-messages" class="tab-content">
        <div class="admin-hint">
          <span class="pill">Unread ${unreadCount}</span>
          <span style="margin-left: 0.5rem;">Messages are stored in data/contact-messages.json.</span>
        </div>
        <div class="table-wrap">
          ${messages.length ? `
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Status</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>MC #</th>
                <th>Preferred States</th>
                <th>Uploaded Files</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${messageRows}
            </tbody>
          </table>` : '<div class="empty">No contact messages yet.</div>'}
        </div>
      </div>

      <div id="tab-orders" class="tab-content">
        <div class="admin-hint">Review payment proofs and approve or deny orders.</div>
        <div class="table-wrap">
          ${orders.length ? `
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Status</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${orderRows}
            </tbody>
          </table>` : '<div class="empty">No orders yet.</div>'}
        </div>
      </div>
    </div>
  </main>

  <script>
    (function () {
      var currentEditId = null;

      function showTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(function (btn) {
          btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(function (content) {
          content.classList.toggle('active', content.id === 'tab-' + tabName);
        });
      }

      function getInitialTab() {
        var params = new URLSearchParams(window.location.search);
        var tab = params.get('tab');
        if (!tab && window.location.hash) {
          tab = window.location.hash.replace('#', '');
        }
        if (!tab) return 'products';
        return ['products', 'messages', 'orders'].includes(tab) ? tab : 'products';
      }

      document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tab = btn.dataset.tab;
          showTab(tab);
          history.replaceState(null, '', '?tab=' + tab);
        });
      });

      showTab(getInitialTab());

      async function loadProducts() {
        try {
          var res = await fetch('/products', { cache: 'no-store' });
          if (!res.ok) return [];
          var data = await res.json();
          return Array.isArray(data.products) ? data.products : [];
        } catch (error) {
          console.error('Failed to load products:', error);
          return [];
        }
      }

      async function loadIntoTextarea() {
        var products = await loadProducts();
        document.getElementById('admin-json').value = JSON.stringify({ products: products }, null, 2);
        renderProductsGrid(products);
      }

      function renderProductsGrid(products) {
        var grid = document.getElementById('products-grid');
        grid.innerHTML = '';

        products.forEach(function (product) {
          var card = document.createElement('div');
          card.className = 'product-card';

          var badges = [];
          if (product.featured) badges.push('<span class="badge featured">Featured</span>');
          if (product.bestSeller) badges.push('<span class="badge bestseller">Best Seller</span>');

          card.innerHTML =
            '<h4>' + product.names.en + '</h4>' +
            '<div class="price">ETB ' + product.price + '</div>' +
            '<div class="product-id">ID: ' + product.id + '</div>' +
            '<div class="badges">' + badges.join('') + '</div>' +
            '<div class="actions">' +
            '<button class="edit-btn" data-id="' + product.id + '">Edit</button>' +
            '<button class="delete-btn" data-id="' + product.id + '">Delete</button>' +
            '</div>';

          card.querySelector('.edit-btn').addEventListener('click', function () {
            editProduct(product.id);
          });
          card.querySelector('.delete-btn').addEventListener('click', function () {
            deleteProduct(product.id);
          });
          grid.appendChild(card);
        });
      }

      function clearForm() {
        document.getElementById('product-form').reset();
        document.getElementById('image-upload').value = '';
        document.getElementById('image-preview').innerHTML = '';
        currentEditId = null;
      }

      function fillForm(product) {
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-name-en').value = product.names.en;
        document.getElementById('product-name-am').value = product.names.am;
        document.getElementById('product-image').value = product.image;
        document.getElementById('product-featured').checked = product.featured || false;
        document.getElementById('product-bestseller').checked = product.bestSeller || false;
        document.getElementById('product-short-desc-en').value = product.shortDescription.en;
        document.getElementById('product-short-desc-am').value = product.shortDescription.am;
        document.getElementById('product-desc-en').value = product.description.en;
        document.getElementById('product-desc-am').value = product.description.am;
        document.getElementById('product-ingredients-en').value = product.ingredients.en;
        document.getElementById('product-ingredients-am').value = product.ingredients.am;
        document.getElementById('product-culinary-en').value = product.culinary.en;
        document.getElementById('product-culinary-am').value = product.culinary.am;
        document.getElementById('product-shipping-en').value = product.shipping.en;
        document.getElementById('product-shipping-am').value = product.shipping.am;
        currentEditId = product.id;
        document.getElementById('product-id').scrollIntoView({ behavior: 'smooth' });
      }

      async function editProduct(productId) {
        var products = await loadProducts();
        var product = products.find(function (p) { return p.id === productId; });
        if (product) {
          fillForm(product);
          showTab('products');
        }
      }

      async function deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        var response = await fetch('/api/products/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: productId })
        });

        if (!response.ok) {
          alert('Failed to delete product.');
          return;
        }

        await loadIntoTextarea();
        alert('Product deleted successfully!');
      }

      async function saveProduct() {
        var formData = new FormData();
        formData.append('id', document.getElementById('product-id').value);
        formData.append('price', document.getElementById('product-price').value);
        formData.append('image', document.getElementById('product-image').value);
        formData.append('featured', document.getElementById('product-featured').checked ? 'on' : '');
        formData.append('bestseller', document.getElementById('product-bestseller').checked ? 'on' : '');
        formData.append('name-en', document.getElementById('product-name-en').value);
        formData.append('name-am', document.getElementById('product-name-am').value);
        formData.append('short-desc-en', document.getElementById('product-short-desc-en').value);
        formData.append('short-desc-am', document.getElementById('product-short-desc-am').value);
        formData.append('desc-en', document.getElementById('product-desc-en').value);
        formData.append('desc-am', document.getElementById('product-desc-am').value);
        formData.append('ingredients-en', document.getElementById('product-ingredients-en').value);
        formData.append('ingredients-am', document.getElementById('product-ingredients-am').value);
        formData.append('culinary-en', document.getElementById('product-culinary-en').value);
        formData.append('culinary-am', document.getElementById('product-culinary-am').value);
        formData.append('shipping-en', document.getElementById('product-shipping-en').value);
        formData.append('shipping-am', document.getElementById('product-shipping-am').value);

        var fileInput = document.getElementById('image-upload');
        if (fileInput && fileInput.files && fileInput.files[0]) {
          formData.append('imageFile', fileInput.files[0]);
        }

        var response = await fetch('/api/products', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          alert('Failed to save product.');
          return false;
        }

        var result = await response.json();
        if (result.product && result.product.image) {
          document.getElementById('product-image').value = result.product.image;
        }

        var wasEdit = Boolean(currentEditId);
        await loadIntoTextarea();
        clearForm();
        alert(wasEdit ? 'Product updated successfully!' : 'Product added successfully!');
        return true;
      }

      document.getElementById('product-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        await saveProduct();
      });

      document.getElementById('image-upload').addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          alert('Please select an image file.');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert('Image size should be less than 5MB.');
          return;
        }

        var reader = new FileReader();
        reader.onload = function (event) {
          var preview = document.getElementById('image-preview');
          preview.innerHTML = '<img src="' + event.target.result + '" alt="Preview">';
        };
        reader.readAsDataURL(file);
      });

      document.getElementById('clear-form').addEventListener('click', clearForm);

      document.getElementById('admin-save').addEventListener('click', function () {
        var raw = document.getElementById('admin-json').value;
        try {
          var data = JSON.parse(raw);
          if (!data || !Array.isArray(data.products)) throw new Error('JSON must contain a "products" array.');
          fetch('/api/products/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          }).then(function (res) {
            if (!res.ok) throw new Error('Save failed');
            alert('Saved to server.');
            renderProductsGrid(data.products);
          }).catch(function (err) {
            alert('Failed to save: ' + err.message);
          });
        } catch (e) {
          alert('Invalid JSON: ' + e.message);
        }
      });

      document.getElementById('admin-reset').addEventListener('click', function () {
        loadIntoTextarea();
        alert('Reloaded from server.');
      });

      document.getElementById('admin-download').addEventListener('click', function () {
        var raw = document.getElementById('admin-json').value;
        try {
          JSON.parse(raw);
        } catch (e) {
          alert('Fix JSON errors before download.');
          return;
        }
        var blob = new Blob([raw], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'products.json';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      document.getElementById('admin-import').addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = async function () {
          document.getElementById('admin-json').value = r.result;
          try {
            var data = JSON.parse(r.result);
            if (data && Array.isArray(data.products)) {
              renderProductsGrid(data.products);
            }
          } catch (err) {
            console.error('Invalid JSON imported');
          }
        };
        r.readAsText(f);
        e.target.value = '';
      });

      loadIntoTextarea();
    })();
  </script>
</body>
</html>`;
}

async function handleContactPost(req, res) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const submissionId = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  let parsedBody = {};
  let uploadedFiles = [];
  let submissionDir = '';

  if (contentType.includes('multipart/form-data')) {
    const parsedMultipart = await parseMultipartForm(req, submissionId);
    parsedBody = parsedMultipart.fields;
    uploadedFiles = parsedMultipart.files;
    submissionDir = parsedMultipart.submissionDir;
  } else {
    const rawBody = await readRequestBody(req);
    parsedBody = parseBody(rawBody, contentType);
  }

  const payload = normalizeContactPayload(parsedBody, req, uploadedFiles);
  const validationError = validateContactMessage(payload);

  if (validationError) {
    if (submissionDir) {
      removeDirSafe(submissionDir);
    }
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return json(res, 400, { ok: false, error: validationError });
    }

    return send(res, 400, `
      <h1>Submission failed</h1>
      <p>${escapeHtml(validationError)}</p>
      <p><a href="/contact.html">Back to contact form</a></p>
    `);
  }

  const messages = loadMessages();
  const record = {
    id: submissionId,
    createdAt: new Date().toISOString(),
    readAt: null,
    ...payload,
  };
  messages.push(record);
  saveMessages(messages);

  if (!isHtmlPreferred(req) || req.headers.accept?.includes('application/json')) {
    return json(res, 201, { ok: true, message: 'Message received.' });
  }

  res.writeHead(303, { Location: '/contact.html?sent=1' });
  res.end();
}

async function handleOrderPost(req, res) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const orderId = `order-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  let parsedBody = {};
  let uploadedFiles = [];
  let submissionDir = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const parsedMultipart = await parseMultipartForm(req, orderId);
      parsedBody = parsedMultipart.fields;
      uploadedFiles = parsedMultipart.files;
      submissionDir = parsedMultipart.submissionDir;
    } else {
      const rawBody = await readRequestBody(req);
      parsedBody = parseBody(rawBody, contentType);
    }
  } catch (error) {
    if (submissionDir) removeDirSafe(submissionDir);
    return json(res, 400, { ok: false, error: 'Failed to parse order submission.' });
  }

  const orderPayload = parsedBody.order && typeof parsedBody.order === 'string'
    ? safeJsonParse(parsedBody.order, {})
    : parsedBody;

  const user = normalizeOrderUser(orderPayload || {});
  const items = normalizeOrderItems(orderPayload.items);
  const totals = normalizeOrderTotals(orderPayload.totals);
  const payment = orderPayload.payment && typeof orderPayload.payment === 'object' ? orderPayload.payment : {};
  const paymentStatus = String(payment.status || orderPayload.paymentStatus || 'pending').trim();
  const paymentMethod = String(payment.method || orderPayload.paymentMethod || '').trim();
  const proofFile = uploadedFiles.find((file) => file.fieldName === 'paymentProof') || uploadedFiles[0] || null;

  if (!user.email) {
    if (submissionDir) removeDirSafe(submissionDir);
    return json(res, 400, { ok: false, error: 'Email is required for the order.' });
  }
  if (!items.length) {
    if (submissionDir) removeDirSafe(submissionDir);
    return json(res, 400, { ok: false, error: 'At least one order item is required.' });
  }
  if (paymentStatus !== 'paid' && !proofFile) {
    if (submissionDir) removeDirSafe(submissionDir);
    return json(res, 400, { ok: false, error: 'Payment proof file is required.' });
  }

  const now = new Date().toISOString();
  const orderRecord = {
    id: orderId,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    userId: user.email,
    user,
    items,
    totals,
    payment: {
      status: paymentStatus,
      method: paymentMethod,
      proof: proofFile || null,
      note: String(payment.note || ''),
    },
    shipping: orderPayload.shipping || {},
    meta: {
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers.referer || req.headers.referrer || '',
    },
  };

  upsertUserRecord(user);

  const orders = loadOrders();
  orders.push(orderRecord);
  saveOrders(orders);

  return json(res, 201, { ok: true, orderId });
}

async function handleProductUpsert(req, res) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return json(res, 400, { ok: false, error: 'Multipart form data required.' });
  }

  let parsed;
  try {
    parsed = await parseProductMultipartForm(req);
  } catch (error) {
    return json(res, 400, { ok: false, error: 'Failed to parse product form.' });
  }

  const { fields, fileMeta } = parsed;
  const productsData = loadProductsData();
  const existingIndex = productsData.products.findIndex((p) => p.id === String(fields.id || '').trim());
  const existingProduct = existingIndex >= 0 ? productsData.products[existingIndex] : null;
  const product = normalizeProductPayload(fields, fileMeta, existingProduct);

  if (!product.id) {
    return json(res, 400, { ok: false, error: 'Product ID is required.' });
  }
  if (!product.names.en || !product.names.am) {
    return json(res, 400, { ok: false, error: 'Product name is required.' });
  }
  if (!Number.isFinite(product.price) || product.price <= 0) {
    return json(res, 400, { ok: false, error: 'Product price is required.' });
  }

  if (existingIndex >= 0) {
    productsData.products[existingIndex] = product;
  } else {
    productsData.products.push(product);
  }

  saveProductsData(productsData);
  return json(res, 200, { ok: true, product });
}

async function handleProductsBulkSave(req, res) {
  const rawBody = await readRequestBody(req);
  let payload = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(res, 400, { ok: false, error: 'Invalid JSON.' });
  }
  if (!payload || !Array.isArray(payload.products)) {
    return json(res, 400, { ok: false, error: 'Payload must include products array.' });
  }
  saveProductsData({ products: payload.products });
  return json(res, 200, { ok: true });
}

async function handleProductDelete(req, res) {
  const rawBody = await readRequestBody(req);
  let payload = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = parseBody(rawBody, req.headers['content-type'] || '');
  }
  const id = String(payload.id || '').trim();
  if (!id) {
    return json(res, 400, { ok: false, error: 'Product ID required.' });
  }

  const productsData = loadProductsData();
  const updated = productsData.products.filter((p) => p.id !== id);
  if (updated.length === productsData.products.length) {
    return json(res, 404, { ok: false, error: 'Product not found.' });
  }
  productsData.products = updated;
  saveProductsData(productsData);
  return json(res, 200, { ok: true });
}

function getMessageUploadDirectory(message) {
  if (!message?.id) return '';
  return path.join(UPLOADS_DIR, message.id);
}

function markMessageAsRead(messageId) {
  const messages = loadMessages();
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return false;
  if (!messages[idx].readAt) {
    messages[idx].readAt = new Date().toISOString();
    saveMessages(messages);
  }
  return true;
}

function deleteMessage(messageId) {
  const messages = loadMessages();
  const remaining = messages.filter((m) => m.id !== messageId);
  if (remaining.length === messages.length) return false;
  saveMessages(remaining);
  removeDirSafe(path.join(UPLOADS_DIR, messageId));
  return true;
}

function updateOrderStatus(orderId, status) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;
  const normalized = ['approved', 'denied', 'pending'].includes(status) ? status : 'pending';
  orders[idx] = {
    ...orders[idx],
    status: normalized,
    updatedAt: new Date().toISOString(),
  };
  saveOrders(orders);
  return orders[idx];
}

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

  if (!safeTarget.startsWith(safeRoot)) {
    return notFound(res);
  }

  if (!fs.existsSync(safeTarget) || fs.statSync(safeTarget).isDirectory()) {
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
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
  fs.createReadStream(safeTarget).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'GET' && pathname === '/healthz') {
      return json(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/products') {
      return json(res, 200, loadProductsData());
    }

    if (req.method === 'GET' && pathname === '/admin') {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      return send(res, 200, renderAdminDashboard(loadMessages(), loadOrders()));
    }

    if (req.method === 'GET' && pathname === '/admin/messages') {
      res.writeHead(302, { Location: '/admin?tab=messages' });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/admin/orders') {
      res.writeHead(302, { Location: '/admin?tab=orders' });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/api/contact-messages') {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      return json(res, 200, { ok: true, messages: loadMessages() });
    }

    if (req.method === 'POST' && pathname === '/api/contact') {
      return handleContactPost(req, res);
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

    if (req.method === 'POST' && pathname === '/api/orders') {
      return handleOrderPost(req, res);
    }

    if (req.method === 'POST' && pathname.startsWith('/admin/messages/') && pathname.endsWith('/read')) {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      const messageId = decodeURIComponent(pathname.slice('/admin/messages/'.length, -'/read'.length));
      const ok = markMessageAsRead(messageId);
      if (!ok) {
        return send(res, 404, '<h1>Message not found</h1>');
      }
      res.writeHead(303, { Location: '/admin?tab=messages' });
      res.end();
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/admin/messages/') && pathname.endsWith('/delete')) {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      const messageId = decodeURIComponent(pathname.slice('/admin/messages/'.length, -'/delete'.length));
      const ok = deleteMessage(messageId);
      if (!ok) {
        return send(res, 404, '<h1>Message not found</h1>');
      }
      res.writeHead(303, { Location: '/admin?tab=messages' });
      res.end();
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/admin/orders/') && pathname.endsWith('/status')) {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      const orderId = decodeURIComponent(pathname.slice('/admin/orders/'.length, -'/status'.length));
      const rawBody = await readRequestBody(req);
      const body = parseBody(rawBody, req.headers['content-type'] || '');
      const status = String(body.status || '').trim().toLowerCase();
      const updated = updateOrderStatus(orderId, status);
      if (!updated) {
        return send(res, 404, '<h1>Order not found</h1>');
      }

      if (updated.status === 'approved') {
        try {
          await sendOrderApprovalEmail(updated);
        } catch (error) {
          console.error('Order approval email failed:', error);
        }
      }

      res.writeHead(303, { Location: '/admin?tab=orders' });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/data/uploads/')) {
      if (!isAdminAuthorized(req)) {
        return unauthorized(res, req);
      }
      return sendStaticFile(req, res, pathname);
    }

    if (pathname.startsWith('/data/')) {
      return notFound(res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return sendStaticFile(req, res, pathname);
    }

    return send(res, 405, '<h1>Method Not Allowed</h1>');
  } catch (error) {
    console.error(error);
    return send(res, 500, '<h1>Internal Server Error</h1>');
  }
});

ensureStorage();
server.listen(PORT, () => {
  console.log(`Contact server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('Admin auth env vars not set. Using default credentials: admin / change-me');
  }
});
