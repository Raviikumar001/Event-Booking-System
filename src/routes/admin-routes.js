const express = require('express');
const { requireAuth, requireRole } = require('../core/auth-middleware');
const { sendWelcomeEmail } = require('../core/email-service');

const router = express.Router();

// Simple admin/test endpoint to validate email delivery
router.post('/admin/test-email', requireAuth, requireRole('ORGANIZER'), async (req, res) => {
  const to = String(req.body?.to || '').trim();
  if (!to) return res.status(400).json({ error: 'Missing to email' });
  try {
    const result = await sendWelcomeEmail(to);
    const response = { ok: true };
    if (process.env.NODE_ENV !== 'production') {
      if (result.previewUrl) response.emailPreviewUrl = result.previewUrl;
      if (result.provider) response.emailProvider = result.provider;
    }
    res.json(response);
  } catch (err) {
    res.status(502).json({ ok: false, error: err?.message || 'Email send failed' });
  }
});

module.exports = router;
