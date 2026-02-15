const request = require('supertest');
const { createApp } = require('../src/app');
const { getPrisma } = require('../src/models/prisma-client');

jest.mock('../src/core/email-service', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue({ previewUrl: undefined }),
  sendRegistrationEmail: jest.fn().mockResolvedValue(undefined),
  sendEventUpdatedEmail: jest.fn().mockResolvedValue(undefined),
}));

describe('Auth E2E', () => {
  const app = createApp();
  const prisma = getPrisma();

  beforeAll(async () => {
    await prisma.registration.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('registers an organizer', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'org@example.com', password: 'StrongPass123', role: 'organizer' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('org@example.com');
    expect(res.body.user.role).toBe('ORGANIZER');
  });

  it('logs in organizer and returns token', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'org@example.com', password: 'StrongPass123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ORGANIZER');
  });

  it('rejects duplicate registration for same email across roles', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'ORG@EXAMPLE.COM', password: 'StrongPass123', role: 'attendee' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });
});
