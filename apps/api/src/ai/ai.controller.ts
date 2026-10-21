import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { AiService, type PublicAiConfig, type UpdateAiConfig } from './ai.service';
import type { GeneratedTemplate } from './ai.providers';

const updateSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']).optional(),
  model: z.string().trim().max(100).optional(),
  apiKey: z.string().trim().max(400).optional(),
});

const generateSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  context: z.string().trim().max(4000).optional(),
});

@Controller('ai')
@UseGuards(SessionGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('config')
  config(): Promise<PublicAiConfig> {
    return this.ai.getConfig();
  }

  @Put('config')
  update(@Body(new ZodBodyPipe(updateSchema)) dto: UpdateAiConfig): Promise<PublicAiConfig> {
    return this.ai.updateConfig(dto);
  }

  @Post('test')
  test(): Promise<{ ok: true }> {
    return this.ai.test();
  }

  @Post('generate-template')
  generate(@Body(new ZodBodyPipe(generateSchema)) dto: { prompt: string; context?: string }): Promise<GeneratedTemplate> {
    return this.ai.generateTemplate(dto.prompt, dto.context);
  }
}
