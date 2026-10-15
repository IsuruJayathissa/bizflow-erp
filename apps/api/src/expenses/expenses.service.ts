import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { Prisma } from '@prisma/client';

const DEFAULT_CATEGORIES = [
  {
    name: 'Rent & Lease',
    description: 'Showroom, warehouse, and office monthly rental commitments',
  },
  {
    name: 'Utilities & Power',
    description: 'Electricity, water, internet, and phone bills',
  },
  {
    name: 'Staff & Salaries',
    description: 'Wages, overtime, bonuses, and staff welfare expenses',
  },
  {
    name: 'Office Supplies',
    description: 'Stationery, printer toner, packaging, and cleaning materials',
  },
  {
    name: 'Marketing & Ads',
    description: 'Digital advertisements, printing banners, and promotional campaigns',
  },
  {
    name: 'Repairs & Maintenance',
    description: 'Equipment servicing, building maintenance, and IT hardware repairs',
  },
  {
    name: 'Logistics & Fuel',
    description: 'Transport costs, vehicle fuel, and delivery courier fees',
  },
  {
    name: 'Petty Cash & Misc',
    description: 'Daily miscellaneous operational micro-expenses',
  },
];

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // EXPENSE CATEGORIES
  // ==========================================

  /**
   * Seed default categories if business currently has none
   */
  async ensureDefaultCategories(businessId: string) {
    const count = await this.prisma.expenseCategory.count({
      where: { businessId },
    });

    if (count === 0) {
      await this.prisma.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES.map((cat) => ({
          businessId,
          name: cat.name,
          description: cat.description,
        })),
      });
    }
  }

  async createCategory(businessId: string, dto: CreateExpenseCategoryDto) {
    const existing = await this.prisma.expenseCategory.findFirst({
      where: {
        businessId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Expense category "${dto.name}" already exists in your business`,
      );
    }

    return this.prisma.expenseCategory.create({
      data: {
        businessId,
        name: dto.name.trim(),
        description: dto.description ? dto.description.trim() : null,
      },
    });
  }

  async findAllCategories(businessId: string) {
    await this.ensureDefaultCategories(businessId);

    const categories = await this.prisma.expenseCategory.findMany({
      where: { businessId },
      include: {
        _count: {
          select: { expenses: true },
        },
        expenses: {
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((cat) => {
      const totalAmount = cat.expenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        createdAt: cat.createdAt,
        expensesCount: cat._count.expenses,
        totalAmount,
      };
    });
  }

  async updateCategory(
    businessId: string,
    id: string,
    dto: CreateExpenseCategoryDto,
  ) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, businessId },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    const duplicate = await this.prisma.expenseCategory.findFirst({
      where: {
        businessId,
        id: { not: id },
        name: { equals: dto.name.trim(), mode: 'insensitive' },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        `Another expense category with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        description: dto.description ? dto.description.trim() : null,
      },
    });
  }

  async deleteCategory(businessId: string, id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, businessId },
      include: {
        _count: { select: { expenses: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    if (category._count.expenses > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${category._count.expenses} associated expense records. Delete or reassign those expenses first.`,
      );
    }

    await this.prisma.expenseCategory.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  // ==========================================
  // EXPENSE RECORDS
  // ==========================================

  async createExpense(
    businessId: string,
    userId: string,
    dto: CreateExpenseDto,
  ) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: dto.categoryId, businessId },
    });

    if (!category) {
      throw new NotFoundException('Expense category not found');
    }

    const expenseDate = dto.expenseDate ? new Date(dto.expenseDate) : new Date();

    return this.prisma.expense.create({
      data: {
        businessId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        amount: dto.amount,
        expenseDate,
        paymentMethod: dto.paymentMethod || 'CASH',
        notes: dto.notes ? dto.notes.trim() : null,
        recordedById: userId,
      },
      include: {
        category: true,
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findAllExpenses(businessId: string, query: QueryExpensesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      businessId,
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) {
        where.expenseDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          category: true,
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOneExpense(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
      include: {
        category: true,
        business: {
          select: { id: true, name: true, currency: true },
        },
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense record not found');
    }

    return expense;
  }

  async updateExpense(
    businessId: string,
    id: string,
    dto: UpdateExpenseDto,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
    });

    if (!expense) {
      throw new NotFoundException('Expense record not found');
    }

    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findFirst({
        where: { id: dto.categoryId, businessId },
      });
      if (!category) {
        throw new NotFoundException('Selected expense category not found');
      }
    }

    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        title: dto.title ? dto.title.trim() : undefined,
        amount: dto.amount,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes !== undefined ? (dto.notes ? dto.notes.trim() : null) : undefined,
      },
      include: {
        category: true,
        recordedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async deleteExpense(businessId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, businessId },
    });

    if (!expense) {
      throw new NotFoundException('Expense record not found');
    }

    await this.prisma.expense.delete({
      where: { id },
    });

    return { message: 'Expense record deleted successfully' };
  }

  /**
   * Operational Cost & Category Analytics
   */
  async getExpenseStats(businessId: string) {
    await this.ensureDefaultCategories(businessId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allExpenses, categories] = await Promise.all([
      this.prisma.expense.findMany({
        where: { businessId },
        select: {
          amount: true,
          paymentMethod: true,
          expenseDate: true,
          categoryId: true,
        },
      }),
      this.prisma.expenseCategory.findMany({
        where: { businessId },
        select: { id: true, name: true },
      }),
    ]);

    let totalAmount = 0;
    let thisMonthAmount = 0;
    let todayAmount = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let bankTransferTotal = 0;
    let otherTotal = 0;

    const categoryMap = new Map<
      string,
      { categoryId: string; categoryName: string; totalAmount: number; count: number }
    >();

    categories.forEach((c) => {
      categoryMap.set(c.id, {
        categoryId: c.id,
        categoryName: c.name,
        totalAmount: 0,
        count: 0,
      });
    });

    for (const exp of allExpenses) {
      totalAmount += exp.amount;
      const date = new Date(exp.expenseDate);

      if (date >= todayStart) {
        todayAmount += exp.amount;
      }
      if (date >= monthStart) {
        thisMonthAmount += exp.amount;
      }

      switch (exp.paymentMethod) {
        case 'CASH':
          cashTotal += exp.amount;
          break;
        case 'CARD':
          cardTotal += exp.amount;
          break;
        case 'BANK_TRANSFER':
          bankTransferTotal += exp.amount;
          break;
        default:
          otherTotal += exp.amount;
          break;
      }

      const catEntry = categoryMap.get(exp.categoryId);
      if (catEntry) {
        catEntry.totalAmount += exp.amount;
        catEntry.count += 1;
      }
    }

    const byCategory = Array.from(categoryMap.values())
      .map((entry) => ({
        ...entry,
        percentage: totalAmount > 0 ? Number(((entry.totalAmount / totalAmount) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalExpensesCount: allExpenses.length,
      totalAmount,
      thisMonthAmount,
      todayAmount,
      byPaymentMethod: {
        cash: cashTotal,
        card: cardTotal,
        bankTransfer: bankTransferTotal,
        other: otherTotal,
      },
      byCategory,
      topCategory: byCategory.length > 0 && byCategory[0].totalAmount > 0 ? byCategory[0] : null,
    };
  }
}
