import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
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
import { PurchaseStatus } from '@prisma/client';

export class CreatePurchaseItemDto {
  @ApiProperty({ description: 'Product UUID', example: 'd3b07384-d113-4663-8e99-4c120e340a6b' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity ordered', example: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Purchase / Cost price per unit', example: 12500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ description: 'Supplier UUID', example: 'c1a07384-d113-4663-8e99-4c120e340a6b' })
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @ApiPropertyOptional({ description: 'Custom PO Order Number (auto-generated if omitted)', example: 'PO-202610-001' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Purchase date in ISO format', example: '2026-10-14' })
  @IsOptional()
  @IsString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Discount amount', example: 500.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional({ description: 'Tax amount', example: 2500.0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number = 0;

  @ApiPropertyOptional({
    enum: PurchaseStatus,
    description: 'Initial order status (PENDING or RECEIVED)',
    example: PurchaseStatus.PENDING,
    default: PurchaseStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus = PurchaseStatus.PENDING;

  @ApiPropertyOptional({ description: 'Internal remarks or payment terms', example: 'Payment due 30 days after delivery' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto], description: 'List of line items purchased' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];
}
