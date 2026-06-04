import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFlavorDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Mango Sorbet', description: 'Display name for the flavor' })
  name!: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Sorbet', description: 'Category for grouping flavors' })
  category!: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Refreshing mango sorbet made with real fruit', required: false })
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 120, description: 'Retail price in local currency', required: false })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 50, description: 'Current stock quantity', required: false })
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 15,
    description: 'Minimum stock threshold for low-stock alerts (defaults to 15)',
    required: false,
  })
  minStock?: number;

  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== '')
  @IsUrl()
  @ApiProperty({ example: 'https://example.com/images/mango.png', description: 'Optional image URL', required: false })
  image?: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: true, description: 'Whether the flavor is currently sellable', required: false })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ example: false, description: 'Whether the flavor is seasonal', required: false })
  isSeasonal?: boolean;
}
