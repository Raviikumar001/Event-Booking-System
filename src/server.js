const { createApp } = require('./app');
const { loadEnv } = require('./core/env');

const PORT = loadEnv().PORT;

const app = createApp();
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
