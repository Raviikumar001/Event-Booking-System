const nodemailer = require('nodemailer');
const { buildWelcomeTemplate, buildEventRegistrationTemplate, buildEventUpdatedTemplate } = require('./email-templates');


async function createTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = loadMailerEnv();
  if (!EMAIL_USER || !EMAIL_PASS) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
  }
  const isSecure = Number(EMAIL_PORT) === 465;
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: isSecure,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    requireTLS: !isSecure,
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT || 10000)
  });
}


function loadMailerEnv() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_FROM_NAME } = process.env;
  return {
    EMAIL_HOST: String(EMAIL_HOST || 'smtp.ethereal.email'),
    EMAIL_PORT: Number(EMAIL_PORT || 587),
    EMAIL_USER: String(EMAIL_USER || ''),
    EMAIL_PASS: String(EMAIL_PASS || ''),
    EMAIL_FROM: String(EMAIL_FROM || 'no-reply@virtual-event.local'),
    EMAIL_FROM_NAME: EMAIL_FROM_NAME ? String(EMAIL_FROM_NAME) : undefined
  };
}


async function sendMail(toEmail, template) {
  const transporter = await createTransporter();
  const { EMAIL_FROM, EMAIL_FROM_NAME } = loadMailerEnv();
  const fromAddress = EMAIL_FROM || EMAIL_FROM_NAME; // Allow fallback when only EMAIL_FROM_NAME provided
  const from = EMAIL_FROM_NAME && fromAddress
    ? { name: EMAIL_FROM_NAME, address: fromAddress }
    : fromAddress;
  const info = await transporter.sendMail({ from, to: toEmail, subject: template.subject, text: template.text, html: template.html });
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  return { previewUrl };
}


async function sendRegistrationEmail(toEmail, eventInfo) {
  const template = buildEventRegistrationTemplate(eventInfo);
  return sendMail(toEmail, template);
}


async function sendWelcomeEmail(toEmail) {
  const template = buildWelcomeTemplate(toEmail);
  return sendMail(toEmail, template);
}

async function sendEventUpdatedEmail(toEmail, eventInfo) {
  const template = buildEventUpdatedTemplate(eventInfo);
  return sendMail(toEmail, template);
}

module.exports = { sendRegistrationEmail, sendWelcomeEmail, sendEventUpdatedEmail };
