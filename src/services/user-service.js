const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPrisma } = require('../models/prisma-client');
const { loadEnv } = require('../core/env');

const SALT_ROUNDS = 10;

function mapRole(roleLower) {
  return roleLower === 'organizer' ? 'ORGANIZER' : 'ATTENDEE';
}


async function registerUser(input) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const role = mapRole(input.role);
  const user = await prisma.user.create({ data: { email: input.email, passwordHash, role } });
  return { id: user.id, email: user.email, role: user.role };
}


async function loginUser(input) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const { JWT_SECRET } = loadEnv();
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

module.exports = { registerUser, loginUser };
