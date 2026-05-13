const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me';

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

module.exports = {
  isAdminAuthorized,
};
