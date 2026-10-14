import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { QueryPurchasesDto } from './dto/query-purchases.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Purchase Orders & SCM Receiving')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Create a new purchase order (optional immediate receiving)' })
  @ApiResponse({ status: 201, description: 'Purchase order created successfully' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() createPurchaseDto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(businessId, currentUserId, createPurchaseDto);
  }

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get purchase spend and receiving KPIs' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.purchasesService.getStats(businessId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get paginated list of purchase orders with filters' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryPurchasesDto,
  ) {
    return this.purchasesService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get full purchase order details and items' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(businessId, id);
  }

  @Patch(':id/receive')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Receive shipment goods and increment warehouse stock' })
  async receive(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.receive(businessId, currentUserId, id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cancel purchase order and revert stock if already received' })
  async cancel(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.cancel(businessId, currentUserId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a pending purchase order' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.delete(businessId, id);
  }
}
