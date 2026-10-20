import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { safeStringEqual } from './crypto.util';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'WEB_ORIGIN'>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING.has(req.method)) return true;
    // Public victim-facing endpoints are intentionally cross-origin (served from
    // PUBLIC_BASE_URL, not the admin WEB_ORIGIN) and carry no admin session.
    if (req.path.startsWith('/api/t/')) return true;

    // Origin/Referer check guards every mutation, including unauthenticated
    // ones (login). Browsers always send Origin on cross-site requests, so a
    // forged cross-site POST cannot match. Non-browser clients send neither
    // and are allowed through to the per-route auth guards.
    const origin = req.headers.origin;
    if (origin && origin !== this.env.WEB_ORIGIN) {
      throw new ForbiddenException('Cross-origin request rejected');
    }
    const referer = req.headers.referer;
    if (!origin && referer && !referer.startsWith(this.env.WEB_ORIGIN)) {
      throw new ForbiddenException('Cross-origin request rejected');
    }

    // Authenticated sessions additionally carry a double-submit CSRF token.
    if (!req.session?.adminId) return true;
    const header = req.headers['x-csrf-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token || !req.session.csrfToken || !safeStringEqual(token, req.session.csrfToken)) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }
    return true;
  }
}
