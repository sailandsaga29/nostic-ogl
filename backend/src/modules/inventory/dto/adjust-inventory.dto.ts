import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryChangeType } from '../entities/inventory-transaction.entity';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustInventoryDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'b2d8f3a0-1c2b-4a7d-9f3e-8b9c0d1e2f3a', description: 'Flavor id to adjust' })
  flavorId!: string;

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
