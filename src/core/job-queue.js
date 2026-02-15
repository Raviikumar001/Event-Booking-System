const { sendRegistrationEmail, sendEventUpdatedEmail } = require('./email-service');

const JOB_BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION';
const JOB_EVENT_UPDATED_NOTIFICATION = 'EVENT_UPDATED_NOTIFICATION';
const pendingJobs = [];
let isProcessing = false;

function enqueueJob(jobName, payload) {
  pendingJobs.push({ jobName, payload });
  scheduleProcessing();
}

function scheduleProcessing() {
  if (isProcessing) return;
  isProcessing = true;
  setImmediate(async () => {
    while (pendingJobs.length > 0) {
      const currentJob = pendingJobs.shift();
      if (!currentJob) continue;
      try {
        await executeJob(currentJob.jobName, currentJob.payload);
      } catch (err) {
        console.log('[JOB] Failed:', currentJob.jobName, err?.message || err);
      }
    }
    isProcessing = false;
    if (pendingJobs.length > 0) scheduleProcessing();
  });
}

async function executeJob(jobName, payload) {
  if (jobName === JOB_BOOKING_CONFIRMATION) {
    await executeBookingConfirmationJob(payload);
    return;
  }
  if (jobName === JOB_EVENT_UPDATED_NOTIFICATION) {
    await executeEventUpdatedNotificationJob(payload);
    return;
  }
  console.log('[JOB] Unknown job skipped:', jobName);
}

async function executeBookingConfirmationJob(payload) {
  console.log('[JOB] Booking confirmation triggered:', { userEmail: payload.userEmail, eventId: payload.eventId });
  const result = await sendRegistrationEmail(payload.userEmail, {
    title: payload.eventTitle,
    date: payload.eventDate,
    time: payload.eventTime
  });
  console.log('[JOB] Booking confirmation email sent:', { userEmail: payload.userEmail, previewUrl: result?.previewUrl });
}

async function executeEventUpdatedNotificationJob(payload) {
  if (!Array.isArray(payload.recipients) || payload.recipients.length === 0) {
    console.log('[JOB] Event update notification skipped: no recipients', { eventId: payload.eventId });
    return;
  }
  console.log('[JOB] Event update notification triggered:', { eventId: payload.eventId, recipientsCount: payload.recipients.length });
  for (const recipientEmail of payload.recipients) {
    try {
      const result = await sendEventUpdatedEmail(recipientEmail, {
        title: payload.eventTitle,
        date: payload.eventDate,
        time: payload.eventTime
      });
      console.log('[JOB] Event update email sent:', { eventId: payload.eventId, recipientEmail, previewUrl: result?.previewUrl });
    } catch (err) {
      console.log('[JOB] Event update email failed:', { eventId: payload.eventId, recipientEmail, error: err?.message || err });
    }
  }
}

module.exports = {
  enqueueJob,
  JOB_BOOKING_CONFIRMATION,
  JOB_EVENT_UPDATED_NOTIFICATION
};
