import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

interface AuthRequest extends ExpressRequest {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and return a JWT access token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiBearerAuth('Authorization')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Authorization')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  getProfile(@Request() req: AuthRequest) {
    return req.user;
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('Authorization')
  @ApiOperation({ summary: 'Refresh the current JWT token' })
  @ApiResponse({ status: 200, description: 'New access token returned' })
  async refresh(@Request() req: AuthRequest) {
    return this.authService.refreshToken(req.user.id);
  }
}
