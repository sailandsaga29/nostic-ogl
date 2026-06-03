import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../../orders/entities/order.entity';

export class CreatePartyOrderDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Pace College' })
  partyName!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 24000 })
  totalAmount!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @ApiProperty({ example: 20, description: 'Discount percentage (0–100)' })
  discountPercent!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 19200,
    required: false,
    description: 'Override collected amount; defaults to total after discount',
  })
  totalEarnings?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  userId?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  paymentMethod?: PaymentMethod;
}
