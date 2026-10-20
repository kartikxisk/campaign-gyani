import { Inject, Injectable } from '@nestjs/common';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import type { MergeContext } from '@cg/shared';

// Matches a well-formed Go-style token: {{ .FieldName }}. An unclosed `{{.`
// does not match and is left as literal text.
const TOKEN = /\{\{\s*\.(\w+)\s*\}\}/g;

@Injectable()
export class RenderService {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'PUBLIC_BASE_URL'>) {}

  /** The tracked click URL that records a CLICK then redirects to the landing page. */
  clickUrl(rid: string): string {
    return `${this.env.PUBLIC_BASE_URL}/api/t/c/${rid}`;
  }

  openPixelUrl(rid: string): string {
    return `${this.env.PUBLIC_BASE_URL}/api/t/o/${rid}`;
  }

  /** Replaces supported tokens with their context value; unknown/missing → empty. */
  renderTemplate(html: string, ctx: MergeContext): string {
    return html.replace(TOKEN, (_m, field: string) => {
      const value = (ctx as Record<string, unknown>)[field];
      return value == null ? '' : String(value);
    });
  }

  /** Rewrites anchor hrefs to the tracked click URL, preserving the original as ?u=. */
  rewriteLinks(html: string, rid: string): string {
    return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (_m, pre: string, q: string, href: string) => {
      const tracked = `${this.clickUrl(rid)}?u=${encodeURIComponent(href)}`;
      return `${pre}${q}${tracked}${q}`;
    });
  }

  /** Appends a single 1x1 open-tracking pixel, before </body> when present. */
  injectPixel(html: string, rid: string): string {
    const pixel = `<img src="${this.openPixelUrl(rid)}" width="1" height="1" style="display:none" alt=""/>`;
    if (/<\/body>/i.test(html)) {
      return html.replace(/<\/body>/i, `${pixel}</body>`);
    }
    return html + pixel;
  }

  /** Full render for one recipient: fill tokens (URL set to the tracked link), rewrite links, inject pixel. */
  renderForRecipient(html: string, ctx: MergeContext, rid: string): string {
    const withUrl: MergeContext = { ...ctx, URL: this.clickUrl(rid) };
    const filled = this.renderTemplate(html, withUrl);
    return this.injectPixel(this.rewriteLinks(filled, rid), rid);
  }
}
