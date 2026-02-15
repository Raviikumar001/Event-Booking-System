const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const authRoutes = require('./routes/auth-routes');
  const eventRoutes = require('./routes/event-routes');
  const adminRoutes = require('./routes/admin-routes');
  const userRoutes = require('./routes/user-routes');
  app.use(authRoutes);
  app.use(eventRoutes);
  app.use(adminRoutes);
  app.use(userRoutes);

  const errorHandler = require('./core/error-handler');
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
