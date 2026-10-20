import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const ALLOWED_SMTP_PORTS = new Set([25, 465, 587, 2525]);

function isPrivateIp(ip: string): boolean {
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  if (isIP(ip) === 6) {
    const low = ip.toLowerCase();
    return low === '::1' || low.startsWith('fc') || low.startsWith('fd') || low.startsWith('fe80');
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a >= 224) return true; // multicast / reserved
  return false;
}

export class SmtpTargetError extends Error {}

/** Rejects non-SMTP ports and hosts that resolve to private/loopback/link-local IPs. */
export async function assertSmtpTarget(host: string, port: number): Promise<void> {
  if (!ALLOWED_SMTP_PORTS.has(port)) {
    throw new SmtpTargetError('Port not allowed for SMTP');
  }
  if (!host) throw new SmtpTargetError('Host is required');
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SmtpTargetError('Host could not be resolved');
  }
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new SmtpTargetError('Host resolves to a disallowed address');
  }
}
