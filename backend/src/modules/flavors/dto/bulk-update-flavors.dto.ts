import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateFlavorDto } from './update-flavor.dto';

export class BulkUpdateFlavorItemDto extends UpdateFlavorDto {
  @IsNotEmpty()
  @Type(() => Number)
  @ApiProperty({ example: 1 })
  id!: number;
}

export class BulkUpdateFlavorsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateFlavorItemDto)
  @ApiProperty({ type: [BulkUpdateFlavorItemDto] })
  items!: BulkUpdateFlavorItemDto[];
}
