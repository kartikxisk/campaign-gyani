/**
 * Operator password recovery for the single admin (self-hosted, single-tenant).
 * Usage:
 *   pnpm -F @cg/api reset-password -- --email admin@you.com --password 'NewPass123'
 *   (or set RESET_EMAIL / RESET_PASSWORD env vars)
 */
import { config as loadDotenv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

loadDotenv();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const email = arg('--email') ?? process.env.RESET_EMAIL ?? process.env.ADMIN_EMAIL;
  const password = arg('--password') ?? process.env.RESET_PASSWORD;
  if (!email || !password) {
    console.error('Provide --email and --password (or RESET_EMAIL / RESET_PASSWORD).');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const passwordHash = await hash(password);
  if (admin) {
    await prisma.adminUser.update({ where: { email }, data: { passwordHash, passwordChangedAt: new Date() } });
    console.log(`Password reset for ${email}. All existing sessions are now invalid.`);
  } else {
    await prisma.adminUser.create({ data: { email, passwordHash } });
    console.log(`Created admin ${email}.`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
