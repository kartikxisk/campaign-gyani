import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword, burnVerify } from './crypto.util';

export interface AdminProfile {
  id: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(email: string, password: string): Promise<AdminProfile> {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      await burnVerify(password);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!(await verifyPassword(admin.passwordHash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { id: admin.id, email: admin.email };
  }

  async profile(adminId: string): Promise<AdminProfile> {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    return { id: admin.id, email: admin.email };
  }

  /** Returns the admin's passwordChangedAt epoch ms, or 0 if never changed. */
  async passwordChangedAtMs(adminId: string): Promise<number> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    return admin?.passwordChangedAt ? admin.passwordChangedAt.getTime() : 0;
  }

  async changePassword(adminId: string, current: string, next: string): Promise<void> {
    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
    if (!(await verifyPassword(admin.passwordHash, current))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await hashPassword(next);
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }
}
