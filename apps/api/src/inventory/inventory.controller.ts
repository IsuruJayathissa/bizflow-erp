import {
  Controller,
  Get,
  Post,
  Body,
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
import { InventoryService } from './inventory.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Inventory & Stock Movements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('adjust')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({
    summary: 'Record a stock adjustment, receiving, or shrinkage movement',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock movement recorded and product inventory updated',
  })
  async recordMovement(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.inventoryService.recordMovement(
      businessId,
      currentUserId,
      dto,
    );
  }

  @Get('movements')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({
    summary: 'Get paginated audit ledger of all stock movements with filters',
  })
  async getMovements(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryMovementsDto,
  ) {
    return this.inventoryService.getMovements(businessId, query);
  }

  @Get('alerts')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({
    summary: 'Get active products with stock levels at or below minimum reorder threshold',
  })
  async getLowStockAlerts(@CurrentUser('businessId') businessId: string) {
    return this.inventoryService.getLowStockAlerts(businessId);
  }

  @Get('summary')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Get high-level inventory health summary and 7-day movement metrics',
  })
  async getInventorySummary(@CurrentUser('businessId') businessId: string) {
    return this.inventoryService.getInventorySummary(businessId);
  }
}
