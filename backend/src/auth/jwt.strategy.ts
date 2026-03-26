import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'SECRET_KEY',
    });
  }

  async validate(payload: any) {
    console.log('🔑 JwtStrategy.validate - Payload received:', payload);
    const result = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    console.log('🔑 JwtStrategy.validate - User object:', result);
    return result;
  }
}
