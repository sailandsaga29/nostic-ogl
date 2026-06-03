import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'Optional user id', required: false })
  userId?: number;

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
      { flavorId: 1, quantity: 2 },
      { flavorId: 2, quantity: 1 },
    ],
  })
  items!: CreateOrderItemDto[];
}
