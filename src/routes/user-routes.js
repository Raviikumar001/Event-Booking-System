const express = require('express');
const { requireAuth } = require('../core/auth-middleware');
const { listUserRegistrations } = require('../services/event-service');

const router = express.Router();

router.get('/me/registrations', requireAuth, async (req, res, next) => {
  try {
    const items = await listUserRegistrations(req.auth.userId);
    res.json({ registrations: items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
