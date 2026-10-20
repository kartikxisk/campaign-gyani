import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!MUTATING.has(req.method)) return true;
    // Only authenticated sessions carry CSRF protection; login and public
    // tracking routes have no admin session and are exempt.
    if (!req.session?.adminId) return true;
    const header = req.headers['x-csrf-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token || token !== req.session.csrfToken) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }
    return true;
  }
}
