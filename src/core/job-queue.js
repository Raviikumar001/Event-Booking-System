const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendRegistrationEmail, sendEventUpdatedEmail } = require('./email-service');
const { loadEnv } = require('./env');

const JOB_BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION';
const JOB_EVENT_UPDATED_NOTIFICATION = 'EVENT_UPDATED_NOTIFICATION';
const QUEUE_NAME = 'event-background-tasks';

let redisConnection;
let queue;
let worker;
let workerReadyPromise;
let pendingTestJobs = [];

function isTestEnv() {
  return process.env.NODE_ENV === 'test';
}

function getRedisConnection() {
  if (isTestEnv()) return null;
  if (!redisConnection) {
    const { REDIS_URL } = loadEnv();
    if (!REDIS_URL) {
      throw new Error('Missing required environment variable: REDIS_URL');
    }
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    redisConnection.on('error', (err) => {
      console.log('[JOB] Redis connection error:', err?.message || err);
    });
  }
  return redisConnection;
}

function getQueue() {
  if (isTestEnv()) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }
  return queue;
}

function enqueueJob(jobName, payload) {
  if (isTestEnv()) {
    const jobPromise = executeJob(jobName, payload).catch((err) => {
        console.log('[JOB] Failed:', jobName, err?.message || err);
      });
    pendingTestJobs.push(jobPromise);
    jobPromise.finally(() => {
      pendingTestJobs = pendingTestJobs.filter((pendingJob) => pendingJob !== jobPromise);
    });
    return;
  }

  getQueue()
    .add(jobName, payload)
    .catch((err) => {
      console.log('[JOB] Queue add failed:', jobName, err?.message || err);
    });
}

async function startJobWorker() {
  if (isTestEnv()) return;
  if (workerReadyPromise) {
    await workerReadyPromise;
    return;
  }

  worker = new Worker(
    QUEUE_NAME,
    async (job) => executeJob(job.name, job.data),
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log('[JOB] Completed:', job.name, { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    console.log('[JOB] Failed:', job?.name, {
      jobId: job?.id,
      error: err?.message || err,
    });
  });

  workerReadyPromise = worker.waitUntilReady();
  await workerReadyPromise;
}

async function stopJobWorker() {
  const closers = [];
  if (worker) {
    closers.push(worker.close());
    worker = undefined;
    workerReadyPromise = undefined;
  }
  if (queue) {
    closers.push(queue.close());
    queue = undefined;
  }
  if (redisConnection) {
    closers.push(redisConnection.quit());
    redisConnection = undefined;
  }
  await Promise.allSettled(closers);
}

async function flushTestJobs() {
  if (!isTestEnv()) return;
  await Promise.allSettled([...pendingTestJobs]);
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
    time: payload.eventTime,
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
        time: payload.eventTime,
      });
      console.log('[JOB] Event update email sent:', { eventId: payload.eventId, recipientEmail, previewUrl: result?.previewUrl });
    } catch (err) {
      console.log('[JOB] Event update email failed:', { eventId: payload.eventId, recipientEmail, error: err?.message || err });
    }
  }
}

module.exports = {
  enqueueJob,
  startJobWorker,
  stopJobWorker,
  flushTestJobs,
  JOB_BOOKING_CONFIRMATION,
  JOB_EVENT_UPDATED_NOTIFICATION,
};
