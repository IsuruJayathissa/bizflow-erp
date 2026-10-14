import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { StockMovementType } from '@prisma/client';

export enum AdjustmentMode {
  ADD = 'ADD',
  DEDUCT = 'DEDUCT',
  RECONCILE = 'RECONCILE',
}

export class CreateStockMovementDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'd3b07384-d113-4663-8e99-4c120e340a6b',
  })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    enum: StockMovementType,
    description: 'Movement type (IN, OUT, ADJUSTMENT)',
    example: StockMovementType.ADJUSTMENT,
  })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({
    description:
      'Quantity of items to move (or new target stock level if mode is RECONCILE)',
    example: 10,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    enum: AdjustmentMode,
    description:
      'Adjustment mode: ADD (increment), DEDUCT (decrement), RECONCILE (physical count set)',
    example: AdjustmentMode.ADD,
    default: AdjustmentMode.ADD,
  })
  @IsOptional()
  @IsEnum(AdjustmentMode)
  adjustmentMode?: AdjustmentMode = AdjustmentMode.ADD;

  @ApiProperty({
    description: 'Audit reason for the stock movement or adjustment',
    example: 'Physical stocktake count discrepancy',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    description:
      'Optional reference ID (PO number, Return note #, Damage report #)',
    example: 'ADJ-2026-0042',
  })
  @IsOptional()
  @IsString()
  referenceId?: string;
}
