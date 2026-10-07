import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'Engine Lubricants & Oils' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Detailed category description or specification notes', example: 'Mineral, semi-synthetic, and synthetic automotive motor oils' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID if this is a subcategory tier', example: 'd3b07384-d113-46fb-9b24-749e78280f97' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
