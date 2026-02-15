const { PrismaClient } = require('@prisma/client');

let prisma;

/**
 * Get Prisma client singleton.
 * @returns {PrismaClient}
 */
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

module.exports = { getPrisma };
