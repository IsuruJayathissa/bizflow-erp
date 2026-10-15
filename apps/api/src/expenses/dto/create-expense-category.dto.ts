import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @ApiProperty({
    description: 'Name of the operational expense category',
    example: 'Rent & Lease',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of what costs fall into this category',
    example: 'Showroom, warehouse, and office monthly rental commitments',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
