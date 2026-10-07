import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Full name or company name of the customer', example: 'Sunil Perera' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ description: 'Customer primary contact email', example: 'sunil@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer phone number', example: '+94 77 123 4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Customer billing or delivery address', example: 'No 45, Galle Road, Colombo 03' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Internal CRM notes or preferences', example: 'Prefers credit terms of 14 days' })
  @IsOptional()
  @IsString()
  notes?: string;
}
