import {
  Controller,
  Get,
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
import { InvoicesService } from './invoices.service';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Invoices & Document Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({ summary: 'Get invoice revenue, collections, and overdue receivables KPIs' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.invoicesService.getStats(businessId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({ summary: 'Get paginated list of tax invoices with status and overdue filters' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({ summary: 'Get full printable A4 invoice details and payment history' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update invoice due date or payment status' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(businessId, id, updateInvoiceDto);
  }
}
