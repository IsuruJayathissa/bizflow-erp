import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty({
    description: 'UUID of the expense category',
    example: '8b9c4c1a-289b-4e08-9df5-680459384732',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    description: 'Short descriptive title of the expense item',
    example: 'Monthly Showroom Electricity Bill - CEB',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Expense amount in local currency',
    example: 18500.5,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Date when expense was incurred (ISO string)',
    example: '2026-10-14T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  expenseDate?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Payment method utilized (CASH, CARD, BANK_TRANSFER, OTHER)',
    example: PaymentMethod.CASH,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Detailed memo, invoice/receipt number, or vendor note',
    example: 'Paid directly to CEB counter. Account #982348123',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
