import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ description: 'Product title / name', example: 'Mobil 1 Fully Synthetic Motor Oil 5W-30 (4L)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Stock Keeping Unit (Unique Identifier)', example: 'OIL-MOB-5W30-4L' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  sku: string;

  @ApiPropertyOptional({ description: 'Barcode string (EAN-13, UPC, Code-128)', example: '8901234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: 'Detailed product description or specifications', example: 'Advanced full synthetic engine oil for high performance engines.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Cost / Purchase Price per unit', example: 14500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: 'Retail / Selling Price per unit', example: 18900.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ description: 'Initial stock on hand quantity', example: 25, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({ description: 'Low stock alert threshold quantity', example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ description: 'Unit of measure (units, pieces, liters, kg, sets)', example: 'bottles', default: 'units' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Category UUID classification', example: 'd3b07384-d113-46fb-9b24-749e78280f97' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Primary Supplier UUID partner', example: '7872e091-5eec-40e3-bbfe-924205689aa9' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;
}
