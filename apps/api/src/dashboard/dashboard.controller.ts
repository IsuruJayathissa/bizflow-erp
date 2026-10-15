import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Executive Dashboard & Live Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES_STAFF,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Get consolidated executive business telemetry, real-time KPIs, and chart series',
  })
  @ApiResponse({
    status: 200,
    description: 'Executive dashboard metrics and visual analytics loaded successfully',
  })
  async getOverview(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryDashboardDto,
  ) {
    return this.dashboardService.getOverview(businessId, query);
  }
}
