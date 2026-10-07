import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Apex Autocare & Parts Ltd', description: 'Legal / Trade business name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Business logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: '124 Galle Road, Colombo 03, Sri Lanka', description: 'Headquarters physical address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+94 11 234 5678', description: 'Primary business phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@apexautocare.lk', description: 'Primary business email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'PV00123456', description: 'Business registration / Tax identification number' })
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiPropertyOptional({ example: 'LKR', description: 'Default billing currency (ISO code)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 15.0, description: 'Default sales tax percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'INV-', description: 'Prefix for generated invoices' })
  @IsOptional()
  @IsString()
  invoicePrefix?: string;
}
