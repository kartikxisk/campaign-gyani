import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { WebhooksService } from './webhooks.service';

const suppressSchema = z.object({ email: z.string().email(), reason: z.string().max(40).optional() });

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  // Admin reads the signed URL to configure at their email provider.
  @Get('token')
  @UseGuards(SessionGuard)
  async info(): Promise<{ url: string }> {
    return { url: this.service.url(await this.service.secret()) };
  }

  @Post('rotate')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async rotate(): Promise<{ url: string }> {
    return { url: await this.service.rotate() };
  }

  // Public, token-protected. Providers (SendGrid/Mailgun/SES) POST bounces here.
  @Post('suppress')
  @HttpCode(200)
  async suppress(@Query('token') token: string | undefined, @Body(new ZodBodyPipe(suppressSchema)) dto: { email: string; reason?: string }): Promise<{ ok: true }> {
    if (!(await this.service.verify(token))) throw new ForbiddenException('Invalid webhook token');
    if (!dto.email) throw new BadRequestException('email is required');
    await this.service.suppress(dto.email, dto.reason ?? 'bounce');
    return { ok: true };
  }
}
