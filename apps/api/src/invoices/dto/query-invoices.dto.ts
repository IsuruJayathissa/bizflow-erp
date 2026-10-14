import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class QueryInvoicesDto {
  @ApiPropertyOptional({ description: 'Search by invoice number, sale number, or customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by customer UUID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, description: 'Filter by invoice payment status' })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Filter for overdue invoices only (unpaid past dueDate)' })
  @IsOptional()
  @IsString()
  isOverdue?: string;

  @ApiPropertyOptional({ description: 'Start issue date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End issue date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;
}
