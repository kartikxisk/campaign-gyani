import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { DeliverabilityService, type DomainReport } from './deliverability.service';
import type { SpamResult } from './dns-checks';

const domainSchema = z.object({
  // Accept a bare domain or a from-address; the service strips the local part.
  domain: z.string().trim().min(3).max(255).regex(/^[^\s@]+@?[a-z0-9.-]+\.[a-z]{2,}$/i, 'Enter a domain or email address'),
  selector: z.string().trim().max(100).regex(/^[a-z0-9._-]+$/i).optional(),
});

const contentSchema = z.object({
  subject: z.string().max(998).optional(),
  html: z.string().max(2_000_000).optional(),
  text: z.string().max(2_000_000).optional(),
});

@Controller('deliverability')
@UseGuards(SessionGuard)
export class DeliverabilityController {
  constructor(private readonly svc: DeliverabilityService) {}

  @Post('domain')
  domain(@Body(new ZodBodyPipe(domainSchema)) dto: { domain: string; selector?: string }): Promise<DomainReport> {
    return this.svc.checkDomain(dto.domain, dto.selector);
  }

  @Post('content')
  content(@Body(new ZodBodyPipe(contentSchema)) dto: { subject?: string; html?: string; text?: string }): SpamResult {
    return this.svc.scoreContent(dto);
  }
}
