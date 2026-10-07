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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Supplier Management (SCM)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Register a new supplier profile' })
  @ApiResponse({ status: 201, description: 'Supplier profile created successfully' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(businessId, createSupplierDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all suppliers with procurement summary and accounts payable' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QuerySuppliersDto,
  ) {
    return this.suppliersService.findAll(businessId, query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get SCM aggregate metrics (total suppliers, active, procurement volume, accounts payable)' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.suppliersService.getStats(businessId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get full supplier profile including purchase orders and supplied products' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Update supplier contact details or procurement terms' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(businessId, id, updateSupplierDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle supplier active/archived vendor status' })
  async toggleActive(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.toggleActive(businessId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a supplier (only allowed if no purchases or products linked)' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.delete(businessId, id);
  }
}
