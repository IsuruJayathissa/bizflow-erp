import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateSaleItemDto {
  @ApiProperty({ description: 'Product UUID', example: 'd3b07384-d113-4663-8e99-4c120e340a6b' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity to sell', example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit selling price', example: 14500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class SalePaymentDto {
  @ApiProperty({ description: 'Payment amount tendered', example: 29000.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method: CASH, CARD, BANK_TRANSFER, OTHER',
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'Payment reference ID (Card slip, Bank ref, Cheque #)', example: 'CARD-TXN-9021' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Payment remarks', example: 'Paid in full at counter' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    description: 'Customer UUID (Leave empty / null for walk-in retail customer)',
    example: 'a1b07384-d113-4663-8e99-4c120e340a6b',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Custom Sale / Receipt number (auto-generated if omitted)', example: 'SALE-202610-001' })
  @IsOptional()
  @IsString()
  saleNumber?: string;

  @ApiPropertyOptional({ description: 'Sale date in ISO format', example: '2026-10-14' })
  @IsOptional()
  @IsString()
  saleDate?: string;

  @ApiPropertyOptional({ description: 'Discount amount', example: 500.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional({ description: 'Tax amount', example: 1200.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number = 0;

  @ApiPropertyOptional({ description: 'Sales notes or terms', example: 'Counter POS sale' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateSaleItemDto], description: 'Line items sold' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiPropertyOptional({ type: SalePaymentDto, description: 'Optional payment details for instant settlement' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaymentDto)
  payment?: SalePaymentDto;

  @ApiPropertyOptional({ description: 'Whether to generate a formal linked invoice record', default: true })
  @IsOptional()
  @IsBoolean()
  createInvoice?: boolean = true;
}
