import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Ice Cubes', description: 'Expense description' })
  description!: string;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 245, description: 'Amount in INR' })
  amount!: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Sai', description: 'Single point of contact' })
  spoc!: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    example: '2026-06-01',
    description: 'Date the expense applies to (defaults to today)',
    required: false,
  })
  expenseDate?: string;
}
