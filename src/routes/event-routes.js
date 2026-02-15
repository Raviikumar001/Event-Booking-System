const express = require('express');
const { requireAuth, requireRole } = require('../core/auth-middleware');
const { CreateEventInput, UpdateEventInput } = require('../utils/validators');
const { listEvents, getEventById, createEvent, updateEvent, deleteEvent, registerForEvent, listEventParticipants, listEventRegistrantEmails } = require('../services/event-service');
const { enqueueJob, JOB_BOOKING_CONFIRMATION, JOB_EVENT_UPDATED_NOTIFICATION } = require('../core/job-queue');
const { getPrisma } = require('../models/prisma-client');

const router = express.Router();

router.get('/events', requireAuth, async (_req, res, next) => {
  try {
    const events = await listEvents();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.get('/events/:id', requireAuth, async (req, res, next) => {
  try {
    const event = await getEventById(String(req.params.id));
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post('/events', requireAuth, requireRole('ORGANIZER'), async (req, res, next) => {
  try {
    const parsed = CreateEventInput.parse(req.body);
    const created = await createEvent({ ...parsed, organizerId: req.auth.userId });
    res.status(201).json({ id: created.id });
  } catch (err) {
    next(err);
  }
});

router.put('/events/:id', requireAuth, requireRole('ORGANIZER'), async (req, res, next) => {
  try {
    const parsed = UpdateEventInput.parse(req.body);
    const eventId = String(req.params.id);
    const updatedEvent = await updateEvent(eventId, parsed, req.auth.userId);
    const recipients = await listEventRegistrantEmails(eventId);
    enqueueJob(JOB_EVENT_UPDATED_NOTIFICATION, {
      eventId,
      eventTitle: updatedEvent.title,
      eventDate: updatedEvent.date,
      eventTime: updatedEvent.time,
      recipients
    });
    res.status(200).json({
      updated: true,
      event: updatedEvent,
      backgroundNotification: {
        queued: true,
        recipientsCount: recipients.length
      }
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/events/:id', requireAuth, requireRole('ORGANIZER'), async (req, res, next) => {
  try {
    const eventId = String(req.params.id);
    await deleteEvent(eventId, req.auth.userId);
    res.status(200).json({ deleted: true, eventId });
  } catch (err) {
    next(err);
  }
});

router.post('/events/:id/register', requireAuth, requireRole('ATTENDEE'), async (req, res, next) => {
  try {
    const eventId = String(req.params.id);
    const registrationResult = await registerForEvent(eventId, req.auth.userId);
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    const event = registrationResult?.event || await prisma.event.findUnique({ where: { id: eventId } });
    let queued = false;
    if (registrationResult?.created && user && event) {
      enqueueJob(JOB_BOOKING_CONFIRMATION, {
        eventId,
        userEmail: user.email,
        eventTitle: event.title,
        eventDate: event.date.toISOString().slice(0, 10),
        eventTime: event.time
      });
      queued = true;
    }
    if (!event) throw Object.assign(new Error('Event not found'), { status: 404 });
    const response = {
      success: true,
      registered: Boolean(registrationResult?.created),
      status: registrationResult?.created ? 'registered' : 'already-registered',
      message: registrationResult?.created
        ? 'Ticket booked successfully for this event.'
        : 'You are already registered for this event.',
      event: {
        id: event.id,
        title: event.title,
        date: event.date.toISOString().slice(0, 10),
        time: event.time
      },
      backgroundConfirmation: {
        queued
      }
    };
    res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

router.get('/events/:id/participants', requireAuth, requireRole('ORGANIZER'), async (req, res, next) => {
  try {
    const participants = await listEventParticipants(String(req.params.id), req.auth.userId);
    res.json({ participants });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
