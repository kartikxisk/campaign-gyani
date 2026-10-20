import { lookup } from 'node:dns/promises';
import { isPublicUnicast } from '../mail/smtp-guard';

export class UnsafeUrlError extends Error {}

/** Allows only http(s) URLs whose host resolves exclusively to public unicast IPs. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http(s) URLs are allowed');
  }
  const host = url.hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    if (!isPublicUnicast(host)) throw new UnsafeUrlError('URL resolves to a disallowed address');
    return url;
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError('Host could not be resolved');
  }
  if (addresses.length === 0 || addresses.some((a) => !isPublicUnicast(a.address))) {
    throw new UnsafeUrlError('URL resolves to a disallowed address');
  }
  return url;
}
