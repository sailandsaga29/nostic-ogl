import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  @ApiProperty({ example: OrderStatus.CANCELLED, description: 'New order status' })
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiProperty({
    required: false,
    example: 'Cash received at counter',
    description: 'Optional admin note when updating status',
  })
  comment?: string;
}
