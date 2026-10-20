import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SendingProfile } from '@prisma/client';
import type { SendingProfileDto } from '@cg/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { encryptSecret } from '../auth/crypto.util';
import { buildTransport, type TransportProfile } from '../mail/transport.factory';

export type SafeProfile = Omit<SendingProfile, 'passwordEnc'> & { hasPassword: boolean };

export interface SendTestInput {
  smtpId?: string;
  fromAddress?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  to: string;
  subject?: string;
  html?: string;
}

@Injectable()
export class SendingProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Pick<Env, 'SMTP_ENC_KEY'>,
  ) {}

  private sanitize(p: SendingProfile): SafeProfile {
    const { passwordEnc, ...rest } = p;
    return { ...rest, hasPassword: Boolean(passwordEnc) };
  }

  async create(dto: SendingProfileDto): Promise<SafeProfile> {
    const row = await this.prisma.sendingProfile.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        fromAddress: dto.fromAddress,
        host: dto.host,
        port: dto.port,
        username: dto.username,
        passwordEnc: encryptSecret(dto.password, this.env.SMTP_ENC_KEY),
        ignoreCertErrors: dto.ignoreCertErrors,
        rateLimit: dto.rateLimit,
        maxConnections: dto.maxConnections,
        maxMessages: dto.maxMessages,
        pool: dto.pool,
        headers: dto.headers,
      },
    });
    return this.sanitize(row);
  }

  async findAll(): Promise<SafeProfile[]> {
    const rows = await this.prisma.sendingProfile.findMany({ orderBy: { updatedAt: 'desc' } });
    return rows.map((r) => this.sanitize(r));
  }

  async findOne(id: string): Promise<SafeProfile> {
    const row = await this.prisma.sendingProfile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Sending profile not found');
    return this.sanitize(row);
  }

  async update(id: string, dto: SendingProfileDto): Promise<SafeProfile> {
    const existing = await this.prisma.sendingProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sending profile not found');
    // An empty password means "keep the stored one".
    const passwordEnc = dto.password ? encryptSecret(dto.password, this.env.SMTP_ENC_KEY) : existing.passwordEnc;
    const row = await this.prisma.sendingProfile.update({
      where: { id },
      data: {
        name: dto.name,
        provider: dto.provider,
        fromAddress: dto.fromAddress,
        host: dto.host,
        port: dto.port,
        username: dto.username,
        passwordEnc,
        ignoreCertErrors: dto.ignoreCertErrors,
        rateLimit: dto.rateLimit,
        maxConnections: dto.maxConnections,
        maxMessages: dto.maxMessages,
        pool: dto.pool,
        headers: dto.headers,
      },
    });
    return this.sanitize(row);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.sendingProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Sending profile not found');
    await this.prisma.sendingProfile.delete({ where: { id } });
  }

  async sendTest(input: SendTestInput): Promise<{ ok: true; messageId: string }> {
    let transportProfile: TransportProfile;
    let from: string;
    if (input.smtpId) {
      const p = await this.prisma.sendingProfile.findUnique({ where: { id: input.smtpId } });
      if (!p) throw new NotFoundException('Sending profile not found');
      transportProfile = p;
      from = p.fromAddress;
    } else {
      transportProfile = {
        host: input.host ?? '',
        port: input.port ?? 587,
        username: input.username ?? '',
        passwordEnc: encryptSecret(input.password ?? '', this.env.SMTP_ENC_KEY),
        pool: false,
        maxConnections: 1,
        maxMessages: 1,
        rateLimit: 1,
        ignoreCertErrors: false,
      };
      from = input.fromAddress ?? input.username ?? 'test@localhost';
    }
    const transporter = buildTransport(transportProfile, this.env.SMTP_ENC_KEY, 3000);
    try {
      const info = await transporter.sendMail({
        from,
        to: input.to,
        subject: input.subject ?? 'Campaign-Gyani test message',
        html: input.html ?? '<p>This is a test message from Campaign-Gyani.</p>',
      });
      return { ok: true, messageId: info.messageId };
    } catch (err) {
      throw new BadGatewayException(`SMTP send failed: ${(err as Error).message}`);
    } finally {
      transporter.close();
    }
  }
}
