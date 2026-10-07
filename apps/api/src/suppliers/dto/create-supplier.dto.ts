import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ description: 'Company or enterprise name of the supplier', example: 'Apex Auto Spares & Lubricants' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  companyName: string;

  @ApiPropertyOptional({ description: 'Primary contact representative person', example: 'Mr. Rohan Fernando' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Supplier primary contact email', example: 'sales@apexspares.lk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Supplier phone / mobile number', example: '+94 11 250 8899' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Supplier office / warehouse address', example: 'No 78, Baseline Road, Colombo 09' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Procurement notes, payment terms, or lead times', example: 'Net 30 days payment terms, 2-day delivery' })
  @IsOptional()
  @IsString()
  notes?: string;
}
