import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDashboardDto {
  @ApiPropertyOptional({
    description: 'Time window for trend analytics',
    enum: ['7d', '30d', '90d', 'year'],
    default: '30d',
  })
  @IsOptional()
  @IsString()
  @IsIn(['7d', '30d', '90d', 'year'])
  period?: '7d' | '30d' | '90d' | 'year';
}
