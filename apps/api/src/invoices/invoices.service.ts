import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get paginated invoices with search, status filtering, and customer linking
   */
  async findAll(businessId: string, query: QueryInvoicesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      businessId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.customerId) {
      where.sale = {
        customerId: query.customerId,
      };
    }

    if (query.isOverdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] };
    }

    if (query.startDate || query.endDate) {
      where.issueDate = {};
      if (query.startDate) {
        where.issueDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.issueDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { sale: { saleNumber: { contains: term, mode: 'insensitive' } } },
        { sale: { customer: { name: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          sale: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                },
              },
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      sku: true,
                      unit: true,
                    },
                  },
                },
              },
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
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const enriched = items.map((inv) => {
      const paidAmount = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, inv.total - paidAmount);
      const isOverdue =
        inv.dueDate &&
        new Date(inv.dueDate) < new Date() &&
        balanceDue > 0 &&
        inv.status !== InvoiceStatus.CANCELLED;

      return {
        ...inv,
        paidAmount,
        balanceDue,
        isOverdue: Boolean(isOverdue),
        customer: inv.sale.customer,
        itemsCount: inv.sale.items.length,
        totalUnits: inv.sale.items.reduce((sum, i) => sum + i.quantity, 0),
      };
    });

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Find full printable A4 invoice details including business registration and line items
   */
  async findOne(businessId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            logo: true,
            address: true,
            phone: true,
            email: true,
            registrationNo: true,
            currency: true,
          },
        },
        sale: {
          include: {
            customer: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    unit: true,
                  },
                },
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paidAmount = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, invoice.total - paidAmount);
    const isOverdue =
      invoice.dueDate &&
      new Date(invoice.dueDate) < new Date() &&
      balanceDue > 0 &&
      invoice.status !== InvoiceStatus.CANCELLED;

    return {
      ...invoice,
      paidAmount,
      balanceDue,
      isOverdue: Boolean(isOverdue),
      customer: invoice.sale.customer,
      items: invoice.sale.items,
      itemsCount: invoice.sale.items.length,
      totalUnits: invoice.sale.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  /**
   * Get invoice financial summary and overdue count
   */
  async getStats(businessId: string) {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { businessId },
      include: {
        payments: { select: { amount: true } },
      },
    });

    const nonCancelled = invoices.filter((i) => i.status !== InvoiceStatus.CANCELLED);
    const totalInvoices = invoices.length;
    const totalBilled = nonCancelled.reduce((sum, i) => sum + i.total, 0);

    let totalCollected = 0;
    let overdueCount = 0;

    for (const inv of nonCancelled) {
      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      totalCollected += paid;
      const due = Math.max(0, inv.total - paid);

      if (inv.dueDate && new Date(inv.dueDate) < now && due > 0) {
        overdueCount++;
      }
    }

    const outstandingReceivables = Math.max(0, totalBilled - totalCollected);
    const paidInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.PAID).length;
    const unpaidInvoicesCount = invoices.filter(
      (i) => i.status === InvoiceStatus.UNPAID || i.status === InvoiceStatus.PARTIALLY_PAID,
    ).length;

    return {
      totalInvoices,
      totalBilled,
      totalCollected,
      outstandingReceivables,
      paidInvoicesCount,
      unpaidInvoicesCount,
      overdueCount,
    };
  }

  /**
   * Update invoice due date or payment status
   */
  async update(businessId: string, id: string, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const data: Prisma.InvoiceUpdateInput = {};
    if (dto.dueDate) {
      data.dueDate = new Date(dto.dueDate);
    }
    if (dto.status) {
      data.status = dto.status;
    }

    // Keep linked sale status synchronized
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data,
      });

      if (dto.status) {
        await tx.sale.update({
          where: { id: invoice.saleId },
          data: { status: dto.status },
        });
      }

      return updated;
    });
  }
}
