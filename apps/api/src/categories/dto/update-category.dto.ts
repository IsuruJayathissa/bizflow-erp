import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name', example: 'Engine Lubricants & Oils' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ description: 'Detailed category description or specification notes', example: 'Mineral, semi-synthetic, and synthetic automotive motor oils' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID (or null to make root category)', example: 'd3b07384-d113-46fb-9b24-749e78280f97' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Active category status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
