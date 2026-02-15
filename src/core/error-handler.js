
function errorHandler(err, _req, res, _next) {
  const isZod = err?.name === 'ZodError' || Array.isArray(err?.issues);
  if (isZod) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: (err.issues || []).map((i) => ({ path: i.path, message: i.message }))
    });
  }
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message });
}

module.exports = errorHandler;

