import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { parseId } from '../common/utils/parse-id';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number | string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id: parseId(id) } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        branchCode: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async recordFailedLogin(userId: number | string) {
    const user = await this.findById(userId);
    if (!user) return;

    const attempts = Number(user.failedLoginAttempts ?? 0) + 1;
    user.failedLoginAttempts = attempts;

    if (attempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }

    await this.usersRepository.save(user);
  }

  async resetLockout(userId: number | string) {
    const user = await this.findById(userId);
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await this.usersRepository.save(user);
  }
}
