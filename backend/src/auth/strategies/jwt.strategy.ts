import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
// import { email } from 'zod';

interface JwtPayload {
  sub: string | number;
  email: string;
  role: string;
}
console.log('strategy loaded');
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  validate(payload: JwtPayload) {
    console.log(payload.sub, payload.email, payload.role);
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
