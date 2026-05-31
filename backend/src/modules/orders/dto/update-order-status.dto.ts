import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  @ApiProperty({ example: OrderStatus.CANCELLED, description: 'New order status' })
  status!: OrderStatus;
}
