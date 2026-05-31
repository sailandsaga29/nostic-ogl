import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
console.log('guard loaded');
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
