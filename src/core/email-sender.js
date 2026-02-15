const { MailerSend, EmailParams, Sender, Recipient } = require('mailersend');
const { sendWelcomeEmail: sendWelcomeSMTP, sendRegistrationEmail: sendRegistrationSMTP } = require('./email-service');
const { buildWelcomeTemplate, buildEventRegistrationTemplate } = require('./email-templates');


function loadMailerEnv() {
  const apiKey = String(process.env.MAILERSEND_API_KEY || process.env.API_KEY || '');
  const fromEmail = String(process.env.EMAIL_FROM || 'no-reply@virtual-event.local');
  const fromName = String(process.env.EMAIL_FROM_NAME || 'Virtual Event');
  return { apiKey, fromEmail, fromName };
}


async function sendViaMailerSend(toEmail, template) {
  const { apiKey, fromEmail, fromName } = loadMailerEnv();
  const mailerSend = new MailerSend({ apiKey });
  const sentFrom = new Sender(fromEmail, fromName);
  const recipients = [new Recipient(toEmail, toEmail)];
  const params = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(template.subject)
    .setHtml(template.html)
    .setText(template.text);
  await mailerSend.email.send(params);
  return { provider: 'mailersend' };
}


async function sendWelcomeEmail(toEmail) {
    console.log('sendWelcomeEmail toEmail:', toEmail);
  const { apiKey } = loadMailerEnv();
  console.log('sendWelcomeEmail apiKey:', apiKey);
  const template = buildWelcomeTemplate(toEmail);
  console.log('sendWelcomeEmail template:', template);
  if (apiKey) return sendViaMailerSend(toEmail, template);
  return sendWelcomeSMTP(toEmail);
}


async function sendRegistrationEmail(toEmail, eventInfo) {
  const { apiKey } = loadMailerEnv();
  const template = buildEventRegistrationTemplate(eventInfo);
  if (apiKey) return sendViaMailerSend(toEmail, template);
  return sendRegistrationSMTP(toEmail, eventInfo);
}

module.exports = { sendWelcomeEmail, sendRegistrationEmail };
