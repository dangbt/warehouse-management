import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'wms-super-secret-key-2026',
    });
  }

  validate(payload: { sub: string; email: string; roles: string[]; permissions: string[] }) {
    return { id: payload.sub, email: payload.email, roles: payload.roles, permissions: payload.permissions };
  }
}
