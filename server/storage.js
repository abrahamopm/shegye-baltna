const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'contact-messages.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PRODUCT_UPLOADS_DIR = path.join(ROOT, 'assets', 'uploads');

function ensureStorage() {
  try {
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
  } catch (err) {
    console.warn('Storage initialization warning:', err.message);
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

function saveJsonArray(filePath, data) {
  try {
    ensureStorage();
    const tmpFile = `${filePath}.tmp`;
    fs.writeFileSync(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    console.error(`Failed to save to ${filePath}:`, err.message);
    throw new Error('Storage write failed.');
  }
}

function loadMessages() {
  return loadJsonArray(MESSAGES_FILE);
}

function saveMessages(messages) {
  saveJsonArray(MESSAGES_FILE, messages);
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
  try {
    ensureStorage();
    const safeData = data && Array.isArray(data.products) ? data : { products: [] };
    const tmpFile = `${PRODUCTS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, `${JSON.stringify(safeData, null, 2)}\n`, 'utf8');
    fs.renameSync(tmpFile, PRODUCTS_FILE);
  } catch (err) {
    console.error('Failed to save products data:', err.message);
    throw new Error('Storage write failed.');
  }
}

module.exports = {
  ROOT,
  DATA_DIR,
  UPLOADS_DIR,
  PRODUCT_UPLOADS_DIR,
  ensureStorage,
  loadMessages,
  saveMessages,
  loadProductsData,
  saveProductsData,
  loadUsers: () => loadJsonArray(USERS_FILE),
  saveUsers: (users) => saveJsonArray(USERS_FILE, users),
  loadOrders: () => loadJsonArray(ORDERS_FILE),
  saveOrders: (orders) => saveJsonArray(ORDERS_FILE, orders),
};
