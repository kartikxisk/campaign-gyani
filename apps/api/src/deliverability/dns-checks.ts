// Pure deliverability analysis: parse DNS TXT records and score email content.
// DNS I/O lives in the service; everything here is pure and unit-tested.

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'missing' | 'skipped';

export interface RecordCheck {
  status: CheckStatus;
  message: string;
  record?: string;
  policy?: string;
}

/** Join the multi-chunk TXT answers node returns and find a record by prefix. */
function findRecord(txts: string[][], prefix: string): string | undefined {
  return txts.map((chunks) => chunks.join('')).find((r) => r.trim().toLowerCase().startsWith(prefix.toLowerCase()));
}

export function parseSpf(txts: string[][]): RecordCheck {
  const rec = findRecord(txts, 'v=spf1');
  if (!rec) return { status: 'missing', message: 'No SPF record. Senders cannot prove this domain is authorized — add a v=spf1 record.' };
  const all = rec.match(/([~\-?+])all\b/i)?.[1];
  if (all === '-') return { status: 'pass', record: rec, message: 'SPF present with a hard fail (-all).' };
  if (all === '~') return { status: 'pass', record: rec, message: 'SPF present with a soft fail (~all).' };
  if (all === '+') return { status: 'fail', record: rec, message: 'SPF ends with +all — it authorizes any sender. Tighten to ~all or -all.' };
  return { status: 'warn', record: rec, message: 'SPF record has no explicit all mechanism. Add ~all or -all.' };
}

export function parseDmarc(txts: string[][]): RecordCheck {
  const rec = findRecord(txts, 'v=DMARC1');
  if (!rec) return { status: 'missing', message: 'No DMARC record at _dmarc. Add v=DMARC1 so receivers know how to handle failures.' };
  const policy = rec.match(/\bp=(none|quarantine|reject)\b/i)?.[1]?.toLowerCase();
  if (policy === 'reject' || policy === 'quarantine') return { status: 'pass', record: rec, policy, message: `DMARC enforced (p=${policy}).` };
  if (policy === 'none') return { status: 'warn', record: rec, policy, message: 'DMARC is monitor-only (p=none). Move to quarantine or reject once aligned.' };
  return { status: 'warn', record: rec, message: 'DMARC record has no policy tag (p=). Add p=quarantine or p=reject.' };
}

export function parseDkim(txts: string[][] | null, selector?: string): RecordCheck {
  if (!selector) return { status: 'skipped', message: 'DKIM needs a selector to check. Provide the selector your sender signs with (e.g. "google", "s1").' };
  const rec = txts ? findRecord(txts, 'v=DKIM1') ?? txts.map((c) => c.join('')).find((r) => /p=/.test(r)) : undefined;
  if (!rec) return { status: 'missing', message: `No DKIM key at ${selector}._domainkey. Publish the selector's public key.` };
  if (/\bp=\s*(;|$)/.test(rec)) return { status: 'fail', record: rec, message: 'DKIM key is revoked (empty p=).' };
  return { status: 'pass', record: rec, message: `DKIM key found for selector "${selector}".` };
}

export interface SpamResult {
  score: number; // 0 (clean) .. 100 (very spammy)
  level: 'low' | 'medium' | 'high';
  reasons: string[];
}

const SPAM_WORDS = ['free', 'winner', 'congratulations', 'act now', 'limited time', 'click here', 'verify your account', 'urgent', 'risk-free', 'guarantee', 'cash', 'prize'];

export function scoreSpam(input: { subject?: string; html?: string; text?: string }): SpamResult {
  const subject = input.subject ?? '';
  const html = input.html ?? '';
  const text = input.text ?? '';
  const reasons: string[] = [];
  let score = 0;
  const add = (n: number, why: string) => { score += n; reasons.push(why); };

  if (html && !text.trim()) add(15, 'No plain-text alternative — many filters penalize HTML-only mail.');
  if (subject && subject === subject.toUpperCase() && /[A-Z]/.test(subject)) add(12, 'Subject is all capitals.');
  if (/!!!|\$\$\$/.test(subject)) add(10, 'Subject uses !!! or $$$.');

  const haystack = `${subject} ${text} ${html.replace(/<[^>]+>/g, ' ')}`.toLowerCase();
  const hits = SPAM_WORDS.filter((w) => haystack.includes(w));
  if (hits.length) add(Math.min(20, hits.length * 5), `Spam-trigger phrases: ${hits.slice(0, 5).join(', ')}.`);

  const links = (html.match(/<a\b/gi) ?? []).length;
  if (links > 10) add(10, `Many links (${links}).`);

  const imgs = (html.match(/<img\b/gi) ?? []).length;
  const visibleText = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (imgs > 0 && visibleText.length < 50) add(12, 'Image-heavy with little text — classic image-only spam shape.');

  if (html && !/unsubscribe|\{\{\.UnsubscribeURL\}\}/i.test(html)) add(8, 'No unsubscribe link or token.');

  const level = score >= 45 ? 'high' : score >= 20 ? 'medium' : 'low';
  return { score: Math.min(100, score), level, reasons };
}
