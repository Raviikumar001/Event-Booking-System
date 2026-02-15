const { PrismaClient } = require('@prisma/client');
const { loadEnv } = require('../core/env');

let prisma;

/**
 * Get Prisma client singleton.
 * @returns {PrismaClient}
 */
function getPrisma() {
  if (!prisma) {
    const env = loadEnv();
    process.env.DATABASE_URL = env.DATABASE_URL;
    prisma = new PrismaClient();
  }
  return prisma;
}

module.exports = { getPrisma };
