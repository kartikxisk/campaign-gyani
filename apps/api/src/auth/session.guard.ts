import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const adminId = req.session?.adminId;
    if (!adminId) {
      throw new UnauthorizedException('Authentication required');
    }
    // Invalidate sessions minted before the admin's most recent password change.
    const changedAt = await this.auth.passwordChangedAtMs(adminId);
    const authAt = req.session.authAt ?? 0;
    if (changedAt > authAt) {
      await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
      throw new UnauthorizedException('Session expired, please sign in again');
    }
    return true;
  }
}
