import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.prisma.customer.findFirst({
        where: {
          businessId,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      });

      if (existing) {
        throw new ConflictException('A customer with this email address already exists');
      }
    }

    return this.prisma.customer.create({
      data: {
        businessId,
        name: dto.name.trim(),
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        phone: dto.phone ? dto.phone.trim() : null,
        address: dto.address ? dto.address.trim() : null,
        notes: dto.notes ? dto.notes.trim() : null,
        isActive: true,
      },
    });
  }

  async findAll(businessId: string, query: QueryCustomersDto) {
    const where: any = { businessId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { sales: true },
        },
        sales: {
          select: {
            id: true,
            total: true,
            status: true,
            payments: {
              select: { amount: true },
            },
          },
        },
      },
    });

    return customers.map((c) => {
      const totalOrders = c._count.sales;
      const totalSpent = c.sales.reduce((sum, s) => sum + (s.total || 0), 0);
      
      const outstandingBalance = c.sales.reduce((sum, s) => {
        if (s.status === InvoiceStatus.PAID) return sum;
        const paidAmount = s.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
        const unpaid = Math.max(0, (s.total || 0) - paidAmount);
        return sum + unpaid;
      }, 0);

      // Return customer without full sales array to keep payload lightweight
      const { sales, _count, ...customerData } = c;
      return {
        ...customerData,
        totalOrders,
        totalSpent,
        outstandingBalance,
      };
    });
  }

  async getStats(businessId: string) {
    const [totalCustomers, activeCustomers, customerSales] = await Promise.all([
      this.prisma.customer.count({ where: { businessId } }),
      this.prisma.customer.count({ where: { businessId, isActive: true } }),
      this.prisma.sale.findMany({
        where: { businessId, customerId: { not: null } },
        select: {
          total: true,
          status: true,
          payments: {
            select: { amount: true },
          },
        },
      }),
    ]);

    const totalRevenue = customerSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const outstandingReceivables = customerSales.reduce((sum, s) => {
      if (s.status === InvoiceStatus.PAID) return sum;
      const paid = s.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
      return sum + Math.max(0, (s.total || 0) - paid);
    }, 0);

    return {
      totalCustomers,
      activeCustomers,
      totalRevenue,
      outstandingReceivables,
    };
  }

  async findOne(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                dueDate: true,
                issueDate: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                paymentMethod: true,
                paymentDate: true,
                reference: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    const totalOrders = customer.sales.length;
    const totalSpent = customer.sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const outstandingBalance = customer.sales.reduce((sum, s) => {
      if (s.status === InvoiceStatus.PAID) return sum;
      const paid = s.payments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
      return sum + Math.max(0, (s.total || 0) - paid);
    }, 0);

    return {
      ...customer,
      totalOrders,
      totalSpent,
      outstandingBalance,
    };
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });

    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    if (dto.email && dto.email.trim().toLowerCase() !== customer.email?.toLowerCase()) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.prisma.customer.findFirst({
        where: {
          businessId,
          email: { equals: normalizedEmail, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Another customer already exists with this email address');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.email !== undefined && { email: dto.email ? dto.email.trim().toLowerCase() : null }),
        ...(dto.phone !== undefined && { phone: dto.phone ? dto.phone.trim() : null }),
        ...(dto.address !== undefined && { address: dto.address ? dto.address.trim() : null }),
        ...(dto.notes !== undefined && { notes: dto.notes ? dto.notes.trim() : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async toggleActive(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });

    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        isActive: !customer.isActive,
      },
    });
  }

  async delete(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
    });

    if (!customer) {
      throw new NotFoundException('Customer record not found');
    }

    const salesCount = await this.prisma.sale.count({
      where: { businessId, customerId: id },
    });

    if (salesCount > 0) {
      throw new BadRequestException(
        'Cannot delete customer with transaction history. You can archive this customer instead to maintain accounting integrity.',
      );
    }

    await this.prisma.customer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Customer deleted successfully',
    };
  }
}
