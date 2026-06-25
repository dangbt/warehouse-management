import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        userRoles: { include: { role: { include: { permissions: true } } } },
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = user.userRoles.flatMap((ur) => ur.role.permissions.map((p) => `${p.resource}:${p.action}`));

    const payload = { sub: user.id, email: user.email, roles, permissions };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone,
        department: user.department,
        roles,
        permissions,
        is_active: user.isActive,
      },
    };
  }
}
