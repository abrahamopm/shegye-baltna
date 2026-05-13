const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const {
  UPLOADS_DIR,
  PRODUCT_UPLOADS_DIR,
  loadMessages,
  saveMessages,
  loadProductsData,
  saveProductsData,
  loadOrders,
  saveOrders,
  loadUsers,
  saveUsers,
} = require('./storage');
const {
  json,
  send,
  readRequestBody,
  parseBody,
  toBoolean,
  safeJsonParse,
  isHtmlPreferred,
} = require('./utils');

// Helper: safe file name
function safeFileName(value) {
  const candidate = String(value || '').replaceAll('\\', '/').split('/').pop() || '';
  const cleaned = candidate.replace(/[^\w.\-() ]+/g, '_').trim();
  return cleaned || `upload-${Date.now()}`;
}

// Helper: remove directory safely
function removeDirSafe(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Failed to remove directory:', dirPath, error);
  }
}

// Helper: parse multipart form
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

// Helper: parse product multipart form
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

// Handler: Contact Post
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

  // Basic normalization (simplified from server.js for brevity but keeping core logic)
  const name = parsedBody.name || parsedBody['form_fields[name]'] || '';
  const email = parsedBody.email || parsedBody['form_fields[email]'] || '';
  const messageText = parsedBody.message || parsedBody['form_fields[message]'] || '';

  if (!name || !email || !messageText) {
    if (submissionDir) removeDirSafe(submissionDir);
    return json(res, 400, { ok: false, error: 'Name, Email, and Message are required.' });
  }

  const messages = loadMessages();
  const record = {
    id: submissionId,
    createdAt: new Date().toISOString(),
    readAt: null,
    name,
    email,
    message: messageText,
    documents: uploadedFiles.reduce((acc, f) => ({ ...acc, [f.fieldName]: f }), {}),
  };
  messages.push(record);
  saveMessages(messages);

  if (isHtmlPreferred(req)) {
    res.writeHead(303, { Location: '/contact.html?sent=1' });
    return res.end();
  }
  return json(res, 201, { ok: true, message: 'Message received.' });
}

// Handler: Product Upsert
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
  const id = String(fields.id || '').trim();
  const existingIndex = productsData.products.findIndex((p) => p.id === id);
  const existingProduct = existingIndex >= 0 ? productsData.products[existingIndex] : null;

  const product = {
    id: id || `prod-${Date.now()}`,
    price: Number(fields.price || 0),
    image: fileMeta?.relativePath || fields.image || existingProduct?.image || 'assets/images/product-jar.png',
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
  };

  if (existingIndex >= 0) {
    productsData.products[existingIndex] = product;
  } else {
    productsData.products.push(product);
  }

  saveProductsData(productsData);
  return json(res, 200, { ok: true, product });
}

// Handler: Product Delete
async function handleProductDelete(req, res) {
  const rawBody = await readRequestBody(req);
  const payload = parseBody(rawBody, req.headers['content-type'] || '');
  const id = String(payload.id || '').trim();

  if (!id) return json(res, 400, { ok: false, error: 'Product ID required.' });

  const productsData = loadProductsData();
  const updated = productsData.products.filter((p) => p.id !== id);
  if (updated.length === productsData.products.length) {
    return json(res, 404, { ok: false, error: 'Product not found.' });
  }
  productsData.products = updated;
  saveProductsData(productsData);
  return json(res, 200, { ok: true });
}

// Handler: Order Post
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

  const orderPayload = parsedBody.order ? safeJsonParse(parsedBody.order, {}) : parsedBody;
  
  // Minimal order record (simplified for modularity)
  const orderRecord = {
    id: orderId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    user: orderPayload.user || orderPayload.shipping || {},
    items: orderPayload.items || [],
    totals: orderPayload.totals || { total: 0 },
    payment: {
      status: 'pending',
      proof: uploadedFiles[0] || null,
    }
  };

  const orders = loadOrders();
  orders.push(orderRecord);
  saveOrders(orders);

  return json(res, 201, { ok: true, orderId });
}

module.exports = {
  handleContactPost,
  handleProductUpsert,
  handleProductDelete,
  handleOrderPost,
  handleProductsBulkSave: async (req, res) => {
    const rawBody = await readRequestBody(req);
    const payload = safeJsonParse(rawBody);
    if (!payload || !Array.isArray(payload.products)) return json(res, 400, { ok: false });
    saveProductsData({ products: payload.products });
    return json(res, 200, { ok: true });
  }
};
