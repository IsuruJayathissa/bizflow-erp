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
import { ExpensesService } from './expenses.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Expense Management & Operational Costs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  @Post('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Create a new operational expense category' })
  @ApiResponse({ status: 201, description: 'Expense category created successfully' })
  async createCategory(
    @CurrentUser('businessId') businessId: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expensesService.createCategory(businessId, dto);
  }

  @Get('categories')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'List all operational expense categories with spend totals' })
  async findAllCategories(@CurrentUser('businessId') businessId: string) {
    return this.expensesService.findAllCategories(businessId);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an existing expense category name or description' })
  async updateCategory(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: CreateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(businessId, id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an expense category (only if no linked expenses exist)' })
  async deleteCategory(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.deleteCategory(businessId, id);
  }

  // ==========================================
  // EXPENSE RECORDS & ANALYTICS
  // ==========================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Record a new operational expense payment' })
  @ApiResponse({ status: 201, description: 'Expense recorded successfully' })
  async createExpense(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.createExpense(businessId, userId, dto);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get total operational expenses, monthly trends, and category breakdown' })
  async getExpenseStats(@CurrentUser('businessId') businessId: string) {
    return this.expensesService.getExpenseStats(businessId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get paginated list of operational expenses with search and category filters' })
  async findAllExpenses(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryExpensesDto,
  ) {
    return this.expensesService.findAllExpenses(businessId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get single expense details by ID' })
  async findOneExpense(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.findOneExpense(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update an existing expense entry' })
  async updateExpense(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.updateExpense(businessId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete an expense entry' })
  async deleteExpense(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.deleteExpense(businessId, id);
  }
}
