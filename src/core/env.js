
function loadEnv() {
  require('dotenv').config();
  const isProduction = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT || 3000);
  const JWT_SECRET = String(process.env.JWT_SECRET || (isProduction ? '' : 'replace_me'));
  const APP_BASE_URL = String(process.env.APP_BASE_URL || 'http://localhost:3000');
  const DATABASE_URL = String(process.env.DATABASE_URL || '');
  if (!JWT_SECRET) {
    throw new Error('Missing required environment variable: JWT_SECRET');
  }
  if (!DATABASE_URL) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }
  return { PORT, JWT_SECRET, APP_BASE_URL, DATABASE_URL };
}

module.exports = { loadEnv };
