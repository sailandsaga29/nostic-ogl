import { IsArray, IsIn, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderDto {
  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ example: 'u123', description: 'Optional user id (if placing on behalf of a registered user)', required: false })
  userId?: string;

  @IsOptional()
  @IsNotEmpty()
  @ApiProperty({ example: 'Extra nuts, please', description: 'Optional order note', required: false })
  note?: string;

  @IsOptional()
  @IsIn(Object.values(PaymentMethod))
  @ApiProperty({ example: PaymentMethod.CASH, description: 'Selected payment method', required: false, enum: Object.values(PaymentMethod) })
  paymentMethod?: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ApiProperty({
    type: [CreateOrderItemDto],
    example: [
      { flavorId: 'b2d8f3a0-1c2b-4a7d-9f3e-8b9c0d1e2f3a', quantity: 2 },
      { flavorId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', quantity: 1 },
    ],
  })
  items!: CreateOrderItemDto[];
}
