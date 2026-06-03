import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  private hashTokenId(jti: string): string {
    return createHash('sha256').update(jti).digest('hex');
  }

  private sanitizeUser(user: {
    id: number;
    name: string;
    email: string;
    role: string;
    branchCode?: string | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchCode: user.branchCode,
    };
  }

  private async assertNotLocked(userId: number | string) {
    const user = await this.usersService.findById(userId);
    if (!user) return;

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${minutes} minute(s).`,
      );
    }

    if (user.lockedUntil && user.lockedUntil.getTime() <= Date.now()) {
      await this.usersService.resetLockout(userId);
    }
  }

  private async issueTokenPair(user: {
    id: number;
    email: string;
    role: string;
    name: string;
    branchCode?: string | null;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const jti = randomUUID();

    const refreshToken = this.jwtService.sign(
      { ...payload, jti },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION'),
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp?: number };
    const expiresAt = new Date((decoded.exp ?? 0) * 1000);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: this.hashTokenId(jti),
        expiresAt,
      }),
    );

    return {
      user: this.sanitizeUser(user),
      accessToken: this.jwtService.sign(payload),
      refreshToken,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account locked after too many failed attempts. Try again in ${minutes} minute(s).`,
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.usersService.resetLockout(user.id);
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    return this.issueTokenPair(user);
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    return this.sanitizeUser(user);
  }

  async refreshSession(refreshToken: string) {
    let payload: { sub?: string | number; email?: string; role?: string; jti?: string };

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      }) as typeof payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.sub == null || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId =
      typeof payload.sub === 'number'
        ? payload.sub
        : Number.parseInt(String(payload.sub), 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException(
        'Session expired after account migration — please log in again',
      );
    }

    await this.assertNotLocked(userId);

    const stored = await this.refreshTokenRepo.findOne({
      where: {
        userId,
        tokenHash: this.hashTokenId(payload.jti),
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepo.save(stored);

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return this.issueTokenPair(user);
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      }) as { jti?: string };

      if (payload.jti) {
        await this.refreshTokenRepo.update(
          { tokenHash: this.hashTokenId(payload.jti), revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      }
    } catch {
      // Ignore invalid tokens on logout
    }

    return { success: true };
  }

  async revokeAllUserSessions(userId: number | string) {
    await this.refreshTokenRepo.update(
      { userId: Number(userId), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
