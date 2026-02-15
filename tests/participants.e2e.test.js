const request = require('supertest');
const { createApp } = require('../src/app');
const { getPrisma } = require('../src/models/prisma-client');

jest.mock('../src/core/email-service', () => ({
  sendRegistrationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ previewUrl: undefined }),
}));

describe('Participants & Registrations', () => {
  const app = createApp();
  const prisma = getPrisma();

  let organizerToken = '';
  let attendeeToken = '';
  let eventId = '';

  beforeAll(async () => {
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    await request(app).post('/register').send({ email: 'org3@example.com', password: 'StrongPass123', role: 'organizer' });
    const orgLogin = await request(app).post('/login').send({ email: 'org3@example.com', password: 'StrongPass123' });
    organizerToken = orgLogin.body.token;

    await request(app).post('/register').send({ email: 'att@example.com', password: 'StrongPass123', role: 'attendee' });
    const atLogin = await request(app).post('/login').send({ email: 'att@example.com', password: 'StrongPass123' });
    attendeeToken = atLogin.body.token;

    const created = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Townhall', description: 'Monthly townhall', date: '2026-03-01', time: '09:00' });
    eventId = created.body.id;

    await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('organizer can list participants', async () => {
    const res = await request(app)
      .get(`/events/${eventId}/participants`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.participants)).toBe(true);
    expect(res.body.participants).toContain('att@example.com');
  });

  it('attendee sees their registrations', async () => {
    const res = await request(app)
      .get('/me/registrations')
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.registrations)).toBe(true);
    expect(res.body.registrations.some(e => e.id === eventId)).toBe(true);
  });
});
