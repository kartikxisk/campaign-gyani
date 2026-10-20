import { Injectable } from '@nestjs/common';
import { simpleParser } from 'mailparser';
import { assertPublicUrl } from './ssrf-guard';

export interface ParsedEmail {
  subject: string;
  html: string;
  text: string;
}

type GuardFn = (url: string) => Promise<unknown>;

@Injectable()
export class ImportService {
  constructor(
    private readonly fetchFn: typeof fetch = fetch,
    private readonly guard: GuardFn = assertPublicUrl,
  ) {}

  async importEmail(source: string, convertLinks: boolean): Promise<ParsedEmail> {
    const parsed = await simpleParser(source);
    let html = typeof parsed.html === 'string' ? parsed.html : (parsed.textAsHtml ?? '');
    const text = parsed.text ?? '';
    if (convertLinks) {
      html = html.replace(/(<a\b[^>]*?\bhref=)(["']).*?\2/gi, (_m, pre: string, q: string) => `${pre}${q}{{.URL}}${q}`);
    }
    return { subject: parsed.subject ?? '', html, text };
  }

  async importSite(url: string): Promise<{ html: string }> {
    await this.guard(url);
    const res = await this.fetchFn(url, { redirect: 'error', signal: AbortSignal.timeout(8000) });
    const raw = await res.text();
    // Strip scripts; the result is a review-only starting point shown in a sandboxed preview.
    const html = raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<script\b[^>]*\/>/gi, '');
    return { html };
  }
}
