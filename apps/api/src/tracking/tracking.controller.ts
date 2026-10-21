import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { TrackingService, type ClientMeta } from './tracking.service';

// 1x1 transparent GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

function meta(req: Request): ClientMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

@Controller('t')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @SkipThrottle()
  @Get('o/:rid')
  async open(@Param('rid') rid: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this.tracking.recordOpen(rid, meta(req));
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.end(PIXEL);
  }

  @SkipThrottle()
  @Get('c/:rid')
  async click(@Param('rid') rid: string, @Query('u') u: string | undefined, @Query('s') s: string | undefined, @Req() req: Request, @Res() res: Response): Promise<void> {
    const target = await this.tracking.recordClick(rid, meta(req), u, s);
    res.redirect(302, target);
  }

  @SkipThrottle()
  @Get('view/:rid')
  view(@Param('rid') rid: string): Promise<{ html: string }> {
    return this.tracking.getLandingView(rid);
  }

  @Post('s/:rid')
  async submit(@Param('rid') rid: string, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response): Promise<void> {
    const redirect = await this.tracking.recordSubmit(rid, body ?? {}, meta(req));
    res.redirect(302, redirect);
  }

  @SkipThrottle()
  @Get('r/:rid')
  async report(@Param('rid') rid: string, @Req() req: Request): Promise<{ ok: true }> {
    await this.tracking.recordReport(rid, meta(req));
    return { ok: true };
  }

  @SkipThrottle()
  @Get('u/:rid')
  async unsubscribe(@Param('rid') rid: string, @Res() res: Response): Promise<void> {
    const email = await this.tracking.recordUnsubscribe(rid);
    const safe = email.replace(/[<>&"']/g, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f7f9fa;color:#131922"><div style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem">You're unsubscribed</h1><p style="color:#6b7a84">${safe} won't receive further emails from this sender.</p></div></body></html>`);
  }
}
