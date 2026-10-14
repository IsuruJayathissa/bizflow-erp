import {
  Controller,
  Get,
  Post,
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
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payment Ledger & Settlements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({
    summary:
      'Record payment settlement (inflow from sale/invoice or outflow for purchase)',
  })
  @ApiResponse({ status: 201, description: 'Payment recorded and ledger updated successfully' })
  async recordPayment(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.paymentsService.recordPayment(businessId, userId, dto);
  }

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({
    summary: 'Get net cash flow, inflows, outflows, and breakdown by payment method',
  })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.paymentsService.getStats(businessId);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({
    summary: 'Get paginated payment ledger with direction and search filters',
  })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryPaymentsDto,
  ) {
    return this.paymentsService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({ summary: 'Get payment voucher details by ID' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(businessId, id);
  }
}
