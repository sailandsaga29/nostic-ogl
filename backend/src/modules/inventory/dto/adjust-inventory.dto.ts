import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { InventoryChangeType } from '../entities/inventory-transaction.entity';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustInventoryDto {
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  @ApiProperty({ example: 1, description: 'Flavor id to adjust' })
  flavorId!: number;

  @IsNumber()
  @Min(-1000000)
  @ApiProperty({ example: -5, description: 'Positive to add stock, negative to reduce' })
  change!: number;

  @IsOptional()
  @IsEnum(InventoryChangeType)
  @ApiProperty({ example: InventoryChangeType.ADJUSTMENT, enum: InventoryChangeType, required: false })
  type?: InventoryChangeType;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Correction for spilled batch', required: false })
  reason?: string;
}
