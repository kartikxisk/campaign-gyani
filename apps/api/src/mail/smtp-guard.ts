import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export const ALLOWED_SMTP_PORTS = new Set([25, 465, 587, 2525]);

export class SmtpTargetError extends Error {}

/** True only for globally-routable unicast addresses (IPv4 and IPv6). */
export function isPublicUnicast(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return false;
  }
  // Unwrap IPv4-mapped / IPv4-compatible IPv6 to judge the real target.
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) addr = v6.toIPv4Address();
  }
  return addr.range() === 'unicast';
}

export interface ValidatedTarget {
  address: string;
  servername: string;
}

/**
 * Rejects non-SMTP ports and hosts that resolve to non-public addresses, then
 * returns the validated IP so the caller can connect to it directly (pinning),
 * closing the DNS-rebinding window between check and connect.
 */
export async function assertSmtpTarget(host: string, port: number): Promise<ValidatedTarget> {
  if (!ALLOWED_SMTP_PORTS.has(port)) throw new SmtpTargetError('Port not allowed for SMTP');
  if (!host) throw new SmtpTargetError('Host is required');

  // A literal IP is validated directly.
  if (ipaddr.isValid(host)) {
    if (!isPublicUnicast(host)) throw new SmtpTargetError('Host resolves to a disallowed address');
    return { address: host, servername: host };
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new SmtpTargetError('Host could not be resolved');
  }
  if (addresses.length === 0) throw new SmtpTargetError('Host could not be resolved');
  if (addresses.some((a) => !isPublicUnicast(a.address))) {
    throw new SmtpTargetError('Host resolves to a disallowed address');
  }
  return { address: addresses[0]!.address, servername: host };
}
