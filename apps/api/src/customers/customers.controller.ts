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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Customer Management (CRM)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Create a new customer profile' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(businessId, createCustomerDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all customers with purchase summary and ledger metrics' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryCustomersDto,
  ) {
    return this.customersService.findAll(businessId, query);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get CRM high-level metrics (total customers, active, revenue, outstanding)' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.customersService.getStats(businessId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get full customer profile including order and payment ledger' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF)
  @ApiOperation({ summary: 'Update customer contact information or notes' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(businessId, id, updateCustomerDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle customer active/archived status' })
  async toggleActive(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.toggleActive(businessId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a customer (only allowed if no sales history exists)' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.customersService.delete(businessId, id);
  }
}
