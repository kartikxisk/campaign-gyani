import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { TrackingService, type ClientMeta } from './tracking.service';

// 1x1 transparent GIF.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

function meta(req: Request): ClientMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

@Controller('t')
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Get('o/:rid')
  async open(@Param('rid') rid: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this.tracking.recordOpen(rid, meta(req));
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.end(PIXEL);
  }

  @Get('c/:rid')
  async click(@Param('rid') rid: string, @Query('u') u: string | undefined, @Query('s') s: string | undefined, @Req() req: Request, @Res() res: Response): Promise<void> {
    const target = await this.tracking.recordClick(rid, meta(req), u, s);
    res.redirect(302, target);
  }

  @Get('view/:rid')
  view(@Param('rid') rid: string): Promise<{ html: string }> {
    return this.tracking.getLandingView(rid);
  }

  @Post('s/:rid')
  async submit(@Param('rid') rid: string, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response): Promise<void> {
    const redirect = await this.tracking.recordSubmit(rid, body ?? {}, meta(req));
    res.redirect(302, redirect);
  }

  @Get('r/:rid')
  async report(@Param('rid') rid: string, @Req() req: Request): Promise<{ ok: true }> {
    await this.tracking.recordReport(rid, meta(req));
    return { ok: true };
  }
}
