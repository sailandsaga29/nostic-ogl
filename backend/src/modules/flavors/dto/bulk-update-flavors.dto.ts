import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateFlavorDto } from './update-flavor.dto';

export class BulkUpdateFlavorItemDto extends UpdateFlavorDto {
  @IsNotEmpty()
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  id!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description:
      'Explicitly clear this month’s restocked quantity and invested amount when stock is set to zero',
  })
  resetMonthlyProcurement?: boolean;
}

export class BulkUpdateFlavorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateFlavorItemDto)
  @ApiProperty({ type: [BulkUpdateFlavorItemDto] })
  items!: BulkUpdateFlavorItemDto[];
}
