import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Full name of the new user' })
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'jane.doe@example.com', description: 'Email address for login' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '+1234567890', description: 'Optional phone number', required: false })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'securePassword123', description: 'Password for the new account', minLength: 6 })
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: Role.STAFF, enum: Role, description: 'Role assigned to the new user' })
  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({ example: 'BR001', description: 'Optional branch code for staff users', required: false })
  @IsOptional()
  branchCode?: string;
}
