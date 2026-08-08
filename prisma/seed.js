const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('adminpassword', 10);
  const userPassword = await bcrypt.hash('userpassword', 10);

  // Seed Admin User
  await prisma.user.upsert({
    where: { email: 'admin@eliteacademy.com' },
    update: {},
    create: {
      name: 'Elite Admin',
      email: 'admin@eliteacademy.com',
      password: adminPassword,
      role: 'ADMIN',
      plan: 'ENTERPRISE',
      credits: 100000,
    },
  });

  // Seed Regular User
  await prisma.user.upsert({
    where: { email: 'user@eliteacademy.com' },
    update: {},
    create: {
      name: 'Demo Teacher',
      email: 'user@eliteacademy.com',
      password: userPassword,
      role: 'USER',
      plan: 'FREE',
      credits: 1000,
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
