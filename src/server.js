const { createApp } = require('./app');
const { loadEnv } = require('./core/env');
const { startJobWorker, stopJobWorker } = require('./core/job-queue');

const PORT = loadEnv().PORT;

const app = createApp();

async function startServer() {
  await startJobWorker();
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    await stopJobWorker();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
