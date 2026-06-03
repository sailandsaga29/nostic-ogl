import { IsInt, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'Flavor id to order' })
  flavorId!: number;

  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 2, description: 'Quantity for this flavor' })
  quantity!: number;
}
