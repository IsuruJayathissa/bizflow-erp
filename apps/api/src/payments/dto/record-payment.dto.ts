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

export class RecordPaymentDto {
  @ApiProperty({ description: 'Payment amount', example: 14500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method: CASH, CARD, BANK_TRANSFER, OTHER',
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment date in ISO format (defaults to now)', example: '2026-10-14' })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiPropertyOptional({ description: 'Linked Sale UUID (if settling a sale)', example: 'a1b07384-d113-4663-8e99-4c120e340a6b' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({ description: 'Linked Invoice UUID (if settling an invoice)', example: 'b2c07384-d113-4663-8e99-4c120e340a6b' })
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Linked Purchase UUID (if paying a supplier)', example: 'c3d07384-d113-4663-8e99-4c120e340a6b' })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiPropertyOptional({ description: 'Payment reference ID (Card slip #, Bank slip #, Cheque #)', example: 'CHQ-98124' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Internal remarks or notes', example: 'Settled in full via Commercial Bank' })
  @IsOptional()
  @IsString()
  notes?: string;
}
