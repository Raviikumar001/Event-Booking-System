
function loadEnv() {
  require('dotenv').config();
  const PORT = Number(process.env.PORT || 3000);
  const JWT_SECRET = String(process.env.JWT_SECRET || 'replace_me');
  const APP_BASE_URL = String(process.env.APP_BASE_URL || 'http://localhost:3000');
  const DATABASE_URL = String(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/virtual_event?schema=public');
  return { PORT, JWT_SECRET, APP_BASE_URL, DATABASE_URL };
}

module.exports = { loadEnv };
