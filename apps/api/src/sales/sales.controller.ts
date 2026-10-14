import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sales & Point of Sale (POS)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Create a new sale / POS checkout with inventory deduction' })
  @ApiResponse({ status: 201, description: 'Sale recorded and inventory decremented' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.salesService.create(businessId, currentUserId, createSaleDto);
  }

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get sales revenue and daily performance KPIs' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.salesService.getStats(businessId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get paginated list of sales orders with filters' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QuerySalesDto,
  ) {
    return this.salesService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get full sale receipt, invoice, and payment history' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.findOne(businessId, id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel sale and return goods to warehouse stock' })
  async cancel(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.salesService.cancel(businessId, currentUserId, id);
  }
}
