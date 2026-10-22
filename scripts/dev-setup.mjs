#!/usr/bin/env node
/**
 * Interactive local-development setup.
 *   pnpm dev:setup   (or npm run dev:setup)
 *
 * Asks for the admin login and URLs, writes apps/api/.env (and .env.test if
 * missing), starts docker-compose.dev.yml (Postgres, Redis, Mailpit), applies
 * migrations to the dev and test databases, then creates or updates the admin.
 * Safe to re-run: existing .env values become the defaults, and existing
 * secrets are kept.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = join(ROOT, 'apps/api');
const ENV_FILE = join(API, '.env');
const TEST_ENV_FILE = join(API, '.env.test');
const COMPOSE = ['compose', '-f', join(ROOT, 'docker-compose.dev.yml')];

// Must match docker-compose.dev.yml.
const DB_URL = (db) => `postgresql://cg:cg@localhost:5490/${db}?schema=public`;
const REDIS_URL = 'redis://localhost:6490';

const c = { bold: (s) => `\x1b[1m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m` };
const step = (s) => console.log(`\n${c.bold('›')} ${c.bold(s)}`);
const warn = (s) => console.log(c.yellow(`  ! ${s}`));
const fail = (s) => { console.error(c.red(`\n✗ ${s}`)); process.exit(1); };

// ─── env files ──────────────────────────────────────────────────────────────

function readEnv(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$|^'(.*)'$/, '$1$2');
  }
  return out;
}

// Single quotes are literal to dotenv; fall back to double quotes when the value has one.
const quote = (v) => (/^[\w./:-]*$/.test(v) ? v : v.includes("'") ? `"${v}"` : `'${v}'`);

function writeEnv(file, values) {
  const body = Object.entries(values).map(([k, v]) => `${k}=${quote(String(v))}`).join('\n');
  writeFileSync(file, `${body}\n`);
  chmodSync(file, 0o600);
}

// ─── prompts ────────────────────────────────────────────────────────────────

const rl = createInterface({ input: stdin, output: stdout, terminal: true });
const question = (q) => new Promise((resolve) => rl.question(q, resolve));

// Password entry: while `muted` is set, readline's echo is swallowed — only the
// prompt (re)draws and the final newline get through.
let muted = null;
const write = rl._writeToOutput.bind(rl);
rl._writeToOutput = (s) => {
  if (!muted) return write(s);
  if (s.startsWith(muted)) write(muted);
  else if (/[\r\n]/.test(s)) write('\n');
};

async function ask(label, { def, validate } = {}) {
  for (;;) {
    const raw = (await question(`  ${label}${def ? c.dim(` (${def})`) : ''}: `)).trim();
    const value = raw || def || '';
    const error = validate?.(value);
    if (!error) return value;
    console.log(c.red(`    ${error}`));
  }
}

async function confirm(label, def = true) {
  const raw = (await question(`  ${label} ${c.dim(def ? '[Y/n]' : '[y/N]')}: `)).trim().toLowerCase();
  return raw ? raw.startsWith('y') : def;
}

/** Read a line without echoing it (password entry). */
async function askHidden(label) {
  const prompt = `  ${label}: `;
  muted = prompt;
  try { return await question(prompt); } finally { muted = null; }
}

async function askPassword(hasExisting) {
  for (;;) {
    const hint = hasExisting ? ' (Enter to keep current)' : '';
    const pw = await askHidden(`Admin password${c.dim(hint)}`);
    if (!pw && hasExisting) return null;
    if (pw.length < 8) { console.log(c.red('    At least 8 characters.')); continue; }
    if (pw.includes("'") && pw.includes('"')) { console.log(c.red('    Use single or double quotes, not both.')); continue; }
    if ((await askHidden('Confirm password')) !== pw) { console.log(c.red('    Passwords do not match.')); continue; }
    return pw;
  }
}

const isEmail = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? undefined : 'Enter a valid email.');
const isUrl = (v) => { try { new URL(v); return undefined; } catch { return 'Enter a full URL, e.g. http://localhost:8080'; } };
const isPort = (v) => (/^\d+$/.test(v) && +v > 0 && +v < 65536 ? undefined : 'Enter a port number.');

// ─── processes ──────────────────────────────────────────────────────────────

function run(cmd, args, { env, cwd = ROOT, quiet = false } = {}) {
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const has = (cmd, args = ['--version']) => run(cmd, args, { quiet: true }).ok;

function portOpen(port) {
  return new Promise((resolve) => {
    const s = createConnection({ port, host: '127.0.0.1' });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.setTimeout(1000, () => { s.destroy(); resolve(false); });
  });
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!stdin.isTTY) fail('Run this in an interactive terminal.');
  console.log(c.bold('\nCampaign-Gyani · local dev setup'));

  step('Checking prerequisites');
  if (!has('docker') || !has('docker', ['compose', 'version'])) fail('Docker with the compose plugin is required.');
  if (!has('pnpm')) fail('pnpm is required (corepack enable).');
  console.log(c.green('  ✓ docker, docker compose, pnpm'));

  const current = readEnv(ENV_FILE);
  const exists = Object.keys(current).length > 0;
  if (exists) console.log(c.dim(`  Found apps/api/.env — its values are the defaults below.`));

  step('Admin account');
  const email = await ask('Admin email', { def: current.ADMIN_EMAIL || 'admin@campaign-gyani.local', validate: isEmail });
  const password = await askPassword(exists && Boolean(current.ADMIN_INITIAL_PASSWORD));

  step('URLs');
  const apiPort = await ask('API port', { def: current.API_PORT || '8080', validate: isPort });
  const publicBase = await ask('Public base URL (tracking links, assets)', { def: current.PUBLIC_BASE_URL || `http://localhost:${apiPort}`, validate: isUrl });
  const webOrigin = await ask('Admin console URL', { def: current.WEB_ORIGIN || 'http://localhost:3000', validate: isUrl });

  const env = {
    DATABASE_URL: DB_URL('campaign_gyani'),
    REDIS_URL,
    API_PORT: apiPort,
    // Keep existing secrets: rotating SMTP_ENC_KEY makes stored SMTP passwords undecryptable.
    SESSION_SECRET: current.SESSION_SECRET?.length >= 32 ? current.SESSION_SECRET : randomBytes(32).toString('hex'),
    SMTP_ENC_KEY: current.SMTP_ENC_KEY?.length === 32 ? current.SMTP_ENC_KEY : randomBytes(16).toString('hex'),
    PUBLIC_BASE_URL: publicBase.replace(/\/$/, ''),
    WEB_ORIGIN: webOrigin.replace(/\/$/, ''),
    ADMIN_EMAIL: email,
    ADMIN_INITIAL_PASSWORD: password ?? current.ADMIN_INITIAL_PASSWORD,
    ASSET_DIR: current.ASSET_DIR || './uploads',
  };
  if (exists && current.DATABASE_URL && current.DATABASE_URL !== env.DATABASE_URL) {
    warn(`DATABASE_URL changes to the dev compose database (${env.DATABASE_URL}).`);
  }

  step('Summary');
  console.log(`  Admin        ${email}${password ? '' : c.dim(' (password unchanged)')}`);
  console.log(`  API          :${apiPort}  ·  public ${env.PUBLIC_BASE_URL}`);
  console.log(`  Console      ${env.WEB_ORIGIN}`);
  console.log(`  Services     Postgres :5490 · Redis :6490 · Mailpit :1025 / http://localhost:8025`);
  if (!(await confirm('Write config and set up?'))) { rl.close(); console.log('Nothing changed.'); return; }
  rl.close();

  step('Writing env files');
  writeEnv(ENV_FILE, env);
  console.log(c.green('  ✓ apps/api/.env'));
  const testEnv = readEnv(TEST_ENV_FILE);
  if (!Object.keys(testEnv).length) {
    Object.assign(testEnv, {
      DATABASE_URL: DB_URL('campaign_gyani_test'), REDIS_URL, API_PORT: 8099,
      SESSION_SECRET: randomBytes(32).toString('hex'), SMTP_ENC_KEY: '0123456789abcdef0123456789abcdef',
      PUBLIC_BASE_URL: 'http://localhost:8099', WEB_ORIGIN: 'http://localhost:3000',
      ADMIN_EMAIL: 'admin@test.local', ADMIN_INITIAL_PASSWORD: 'testpass123',
      ASSET_DIR: './uploads-test', CG_DISABLE_WORKER: 1,
    });
    writeEnv(TEST_ENV_FILE, testEnv);
    console.log(c.green('  ✓ apps/api/.env.test'));
  } else {
    console.log(c.dim('  apps/api/.env.test exists — left as is'));
  }

  step('Installing dependencies');
  if (!run('pnpm', ['install']).ok) fail('pnpm install failed.');

  step('Starting services');
  const ours = run('docker', [...COMPOSE, 'ps', '-q', 'postgres'], { quiet: true }).out.trim();
  const busy = !ours && ((await portOpen(5490)) || (await portOpen(6490)));
  if (busy) {
    // Something else (e.g. a hand-started container) already serves these ports.
    warn('Ports 5490/6490 are already in use by containers outside docker-compose.dev.yml — using them as is.');
    warn('Make sure they accept cg:cg and that campaign_gyani_test exists.');
    if (!(await portOpen(1025))) run('docker', [...COMPOSE, 'up', '-d', 'mailpit']);
  } else if (!run('docker', [...COMPOSE, 'up', '-d', '--wait']).ok) {
    fail('docker compose up failed. Check `docker compose -f docker-compose.dev.yml logs`.');
  }

  step('Applying database migrations');
  const prisma = (vars) => run('pnpm', ['-F', '@cg/api', 'exec', 'prisma', 'migrate', 'deploy'], { env: vars });
  if (!prisma(env).ok) fail('Migrating the dev database failed.');
  if (!prisma(testEnv).ok) warn('Migrating the test database failed — `pnpm test` in apps/api needs it.');
  run('pnpm', ['-F', '@cg/api', 'exec', 'prisma', 'generate'], { quiet: true });

  step('Creating admin');
  // Passed via env, not argv, so the password never shows up in `ps`.
  const admin = (vars, pw) => run('pnpm', ['-F', '@cg/api', 'reset-password'], { env: { ...vars, RESET_EMAIL: vars.ADMIN_EMAIL, RESET_PASSWORD: pw } });
  if (password) {
    if (!admin(env, password).ok) fail('Creating the admin failed.');
  } else if (!run('pnpm', ['-F', '@cg/api', 'db:seed'], { env }).ok) {
    fail('Seeding the admin failed.');
  }
  run('pnpm', ['-F', '@cg/api', 'db:seed'], { env: testEnv, quiet: true });

  console.log(`\n${c.green(c.bold('✓ Ready.'))} Start the app with ${c.bold('pnpm dev')}`);
  console.log(`  Console  ${env.WEB_ORIGIN}  ·  sign in as ${email}`);
  console.log(`  Mail     http://localhost:8025  ${c.dim('(sending profile: localhost:1025, no TLS, no auth)')}\n`);
}

main().catch((e) => fail(e?.message ?? String(e)));
