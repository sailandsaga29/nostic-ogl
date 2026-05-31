import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @IsNotEmpty()
  @IsUUID()
  @ApiProperty({ example: 'b2d8f3a0-1c2b-4a7d-9f3e-8b9c0d1e2f3a', description: 'Flavor id to order' })
  flavorId!: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 2, description: 'Quantity for this flavor' })
  quantity!: number;
}
