const express = require('express');
const { RegisterInput, LoginInput } = require('../utils/validators');
const { registerUser, loginUser } = require('../services/user-service');
const { sendWelcomeEmail } = require('../core/email-service');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const parsed = RegisterInput.parse(req.body);
    const user = await registerUser(parsed);
    let emailPreviewUrl;
    let emailProvider;
    let emailError;
    try {
      const result = await sendWelcomeEmail(user.email);
      console.log('Welcome email sent:', result);
      emailPreviewUrl = result.previewUrl;
      emailProvider = result.provider;
    } catch (_mailErr) {
      console.log('Welcome email send failed:', _mailErr);
      emailError = _mailErr?.message || 'Email send failed';
    }
    const response = { user };
    if (process.env.NODE_ENV !== 'production') {
      if (emailPreviewUrl) response.emailPreviewUrl = emailPreviewUrl;
      if (emailProvider) response.emailProvider = emailProvider;
      if (emailError) response.emailError = emailError;
    }
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = LoginInput.parse(req.body);
    const result = await loginUser(parsed);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
