import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: 'Due date in ISO format', example: '2026-11-14' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Invoice payment status' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
