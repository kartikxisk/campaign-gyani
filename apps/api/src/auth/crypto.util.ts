import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

const ALGO = 'aes-256-gcm';

/** Encrypts a secret with AES-256-GCM. Output: base64(iv).base64(tag).base64(ciphertext). */
export function encryptSecret(plain: string, key: string): string {
  const keyBuf = Buffer.from(key, 'utf8');
  if (keyBuf.length !== 32) throw new Error('Encryption key must be 32 bytes');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyBuf, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

export function decryptSecret(payload: string, key: string): string {
  const keyBuf = Buffer.from(key, 'utf8');
  const [ivB64, tagB64, ctB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed ciphertext');
  const decipher = createDecipheriv(ALGO, keyBuf, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}
