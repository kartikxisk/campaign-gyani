import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { sendingProfileSchema, type SendingProfileDto } from '@cg/shared';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { SessionGuard } from '../auth/session.guard';
import { PROVIDER_PRESETS } from '../mail/transport.factory';
import { SendingProfilesService, type SafeProfile, type SendTestInput } from './sending-profiles.service';

const sendTestSchema = z.object({
  smtpId: z.string().optional(),
  fromAddress: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  to: z.string().email(),
  subject: z.string().optional(),
  html: z.string().optional(),
});

@Controller('sending-profiles')
@UseGuards(SessionGuard)
export class SendingProfilesController {
  constructor(private readonly service: SendingProfilesService) {}

  @Get('providers')
  providers(): typeof PROVIDER_PRESETS {
    return PROVIDER_PRESETS;
  }

  @Get()
  findAll(): Promise<SafeProfile[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SafeProfile> {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body(new ZodBodyPipe(sendingProfileSchema)) dto: SendingProfileDto): Promise<SafeProfile> {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body(new ZodBodyPipe(sendingProfileSchema)) dto: SendingProfileDto): Promise<SafeProfile> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.remove(id);
    return { ok: true };
  }

  @Post('test')
  testInline(@Body(new ZodBodyPipe(sendTestSchema)) dto: SendTestInput): Promise<{ ok: true; messageId: string }> {
    return this.service.sendTest(dto);
  }

  @Post(':id/test')
  testById(@Param('id') id: string, @Body(new ZodBodyPipe(sendTestSchema)) dto: SendTestInput): Promise<{ ok: true; messageId: string }> {
    return this.service.sendTest({ ...dto, smtpId: id });
  }
}
