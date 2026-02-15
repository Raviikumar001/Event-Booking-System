const { getPrisma } = require('../models/prisma-client');


async function listEvents() {
  const prisma = getPrisma();
  const events = await prisma.event.findMany({ include: { registrations: true } });
  return events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString().slice(0, 10),
    time: e.time,
    organizerId: e.organizerId,
    participants: e.registrations.length
  }));
}


async function getEventById(id) {
  const prisma = getPrisma();
  const e = await prisma.event.findUnique({ where: { id }, include: { registrations: { include: { user: true } } } });
  if (!e) return null;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    date: e.date.toISOString().slice(0, 10),
    time: e.time,
    organizerId: e.organizerId,
    participants: e.registrations.map(r => r.user.email)
  };
}


async function createEvent(input) {
  const prisma = getPrisma();
  const date = new Date(input.date + 'T00:00:00.000Z');
  const e = await prisma.event.create({ data: { title: input.title, description: input.description, date, time: input.time, organizerId: input.organizerId } });
  return { id: e.id };
}


async function updateEvent(id, data, organizerId) {
  const prisma = getPrisma();
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Event not found'), { status: 404 });
  if (existing.organizerId !== organizerId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  const update = { ...data };
  if (data.date) update.date = new Date(data.date + 'T00:00:00.000Z');
  const updated = await prisma.event.update({ where: { id }, data: update });
  return {
    id: updated.id,
    title: updated.title,
    date: updated.date.toISOString().slice(0, 10),
    time: updated.time
  };
}


async function deleteEvent(id, organizerId) {
  const prisma = getPrisma();
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Event not found'), { status: 404 });
  if (existing.organizerId !== organizerId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  await prisma.registration.deleteMany({ where: { eventId: id } });
  await prisma.event.delete({ where: { id } });
}


async function registerForEvent(eventId, userId) {
  const prisma = getPrisma();
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw Object.assign(new Error('Event not found'), { status: 404 });
  const already = await prisma.registration.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (already) return { created: false, event: existing };
  await prisma.registration.create({ data: { eventId, userId } });
  return { created: true, event: existing };
}

module.exports = { listEvents, getEventById, createEvent, updateEvent, deleteEvent, registerForEvent };

async function listEventParticipants(eventId, organizerId) {
  const prisma = getPrisma();
  const e = await prisma.event.findUnique({ where: { id: eventId }, include: { registrations: { include: { user: true } } } });
  if (!e) throw Object.assign(new Error('Event not found'), { status: 404 });
  if (e.organizerId !== organizerId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return e.registrations.map(r => r.user.email);
}


async function listUserRegistrations(userId) {
  const prisma = getPrisma();
  const regs = await prisma.registration.findMany({ where: { userId }, include: { event: true } });
  return regs.map(r => ({ id: r.event.id, title: r.event.title, date: r.event.date.toISOString().slice(0,10), time: r.event.time }));
}

async function listEventRegistrantEmails(eventId) {
  const prisma = getPrisma();
  const regs = await prisma.registration.findMany({
    where: { eventId },
    include: { user: true }
  });
  return regs.map(registration => registration.user.email);
}

module.exports.listEventParticipants = listEventParticipants;
module.exports.listUserRegistrations = listUserRegistrations;
module.exports.listEventRegistrantEmails = listEventRegistrantEmails;
