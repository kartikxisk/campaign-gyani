import { Body, Controller, Get, HttpCode, Post, Req, UnauthorizedException, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { loginSchema, type LoginDto } from '@cg/shared';
import { z } from 'zod';
import { ZodBodyPipe } from '../common/zod.pipe';
import { AuthService, type AdminProfile } from './auth.service';
import { SessionGuard } from './session.guard';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodBodyPipe(loginSchema))
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AdminProfile> {
    const admin = await this.auth.validate(dto.email, dto.password);
    req.session.adminId = admin.id;
    req.session.csrfToken = randomBytes(24).toString('hex');
    return admin;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request): Promise<{ ok: true }> {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() req: Request): Promise<AdminProfile> {
    return this.auth.profile(req.session.adminId as string);
  }

  @Get('csrf')
  @UseGuards(SessionGuard)
  csrf(@Req() req: Request): { csrfToken: string } {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(24).toString('hex');
    }
    return { csrfToken: req.session.csrfToken };
  }

  @Post('change-password')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @UsePipes(new ZodBodyPipe(changePasswordSchema))
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request): Promise<{ ok: true }> {
    await this.auth.changePassword(req.session.adminId as string, dto.currentPassword, dto.newPassword);
    return { ok: true };
  }
}
