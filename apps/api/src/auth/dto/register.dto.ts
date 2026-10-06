import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'kasun@apexautocare.lk', description: 'User account email' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass@123', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Kasun', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Perera', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: 'Apex Autocare & Parts Ltd', description: 'Business Name (if registering a new business)' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.SALES_STAFF, description: 'Role to assign' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: '+94 77 123 4567', description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;
}
