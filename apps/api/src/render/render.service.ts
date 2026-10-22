import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import type { MergeContext } from '@cg/shared';
import { hmacSign } from '../auth/crypto.util';

// Matches a well-formed Go-style token: {{ .FieldName }}. An unclosed `{{.`
// does not match and is left as literal text.
const TOKEN = /\{\{\s*\.(\w+)\s*\}\}/g;
const URL_FIELDS = new Set(['URL', 'ExternalURL']);

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(v: string): string {
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
  } catch {
    return '';
  }
  return v;
}

@Injectable()
export class RenderService {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'SESSION_SECRET'>) {}

  /** The tracked click URL that records a CLICK then redirects to the landing page. */
  clickUrl(base: string, rid: string): string {
    return `${base}/api/t/c/${rid}`;
  }

  openPixelUrl(base: string, rid: string): string {
    return `${base}/api/t/o/${rid}`;
  }

  unsubscribeUrl(base: string, rid: string): string {
    return `${base}/api/t/u/${rid}`;
  }

  /** Replaces supported tokens with their context value; unknown/missing → empty. */
  renderTemplate(html: string, ctx: MergeContext): string {
    return html.replace(TOKEN, (_m, field: string) => {
      const value = (ctx as Record<string, unknown>)[field];
      if (value == null) return '';
      const raw = String(value);
      // Escape every interpolated value; URL-typed fields also get a scheme allowlist.
      return escapeHtml(URL_FIELDS.has(field) ? safeUrl(raw) : raw);
    });
  }

  /** Rewrites anchor hrefs to the tracked click URL, preserving the original as ?u=. */
  /** Signs a redirect target so the public click endpoint can't be abused as an open redirect. */
  signUrl(rid: string, url: string): string {
    return hmacSign(`${rid}|${url}`, this.env.SESSION_SECRET);
  }

  rewriteLinks(base: string, html: string, rid: string): string {
    return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (_m, pre: string, q: string, href: string) => {
      const tracked = `${this.clickUrl(base, rid)}?u=${encodeURIComponent(href)}&s=${this.signUrl(rid, href)}`;
      return `${pre}${q}${tracked}${q}`;
    });
  }

  /** Appends a single 1x1 open-tracking pixel, before </body> when present. */
  injectPixel(base: string, html: string, rid: string): string {
    const pixel = `<img src="${this.openPixelUrl(base, rid)}" width="1" height="1" style="display:none" alt=""/>`;
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${pixel}</body>`);
    }
    return html + pixel;
  }

  /** Full render for one recipient: fill tokens (URL set to the tracked link), rewrite links, inject pixel. */
  renderForRecipient(base: string, html: string, ctx: MergeContext, rid: string): string {
    const withUrl: MergeContext = { ...ctx, URL: this.clickUrl(base, rid), UnsubscribeURL: this.unsubscribeUrl(base, rid) };
    const filled = this.renderTemplate(html, withUrl);
    return this.injectPixel(base, this.rewriteLinks(base, filled, rid), rid);
  }
}
