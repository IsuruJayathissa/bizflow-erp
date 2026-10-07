import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'kamal@apexautocare.lk', description: 'User email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Staff@123', description: 'Initial account password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Kamal', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Gunaratne', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.SALES_STAFF,
    description: 'Assigned system role (ADMIN, MANAGER, SALES_STAFF, INVENTORY_STAFF, ACCOUNTANT)',
  })
  @IsEnum(UserRole, { message: 'Invalid role specified' })
  @IsNotEmpty()
  role: UserRole;
}
