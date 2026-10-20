import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

loadDotenv();

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD must be set to seed the admin');
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — nothing to seed.`);
  } else {
    const passwordHash = await hash(password);
    await prisma.adminUser.create({ data: { email, passwordHash } });
    console.log(`Seeded admin ${email}.`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
