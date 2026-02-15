const request = require('supertest');
const { createApp } = require('../src/app');
const { getPrisma } = require('../src/models/prisma-client');

jest.mock('../src/core/email-service', () => ({
  sendRegistrationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue({ previewUrl: undefined }),
}));

describe('Events E2E', () => {
  const app = createApp();
  const prisma = getPrisma();

  let organizerToken = '';
  let attendeeToken = '';
  let eventId = '';

  beforeAll(async () => {
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // Register organizer
    await request(app)
      .post('/register')
      .send({ email: 'org2@example.com', password: 'StrongPass123', role: 'organizer' })
      .expect(201);
    const orgLogin = await request(app)
      .post('/login')
      .send({ email: 'org2@example.com', password: 'StrongPass123' })
      .expect(200);
    organizerToken = orgLogin.body.token;

    // Register attendee
    await request(app)
      .post('/register')
      .send({ email: 'user@example.com', password: 'StrongPass123', role: 'attendee' })
      .expect(201);
    const atLogin = await request(app)
      .post('/login')
      .send({ email: 'user@example.com', password: 'StrongPass123' })
      .expect(200);
    attendeeToken = atLogin.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('organizer creates an event', async () => {
    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ title: 'Kickoff', description: 'Project kickoff', date: '2026-02-01', time: '10:00' });
    expect(res.status).toBe(201);
    eventId = res.body.id;
    expect(eventId).toBeTruthy();
  });

  it('lists events for authenticated user', async () => {
    const res = await request(app)
      .get('/events')
      .set('Authorization', `Bearer ${attendeeToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBeGreaterThanOrEqual(1);
  });

  it('attendee registers for event and triggers email', async () => {
    const res = await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(true);
  });
});
