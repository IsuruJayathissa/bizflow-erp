import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { InvoiceStatus, StockMovementType, Prisma } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateSaleNumber(businessId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.sale.count({
      where: { businessId },
    });
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `SALE-${today}-${(count + 1).toString().padStart(3, '0')}-${randomHex}`;
  }

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.invoice.count({
      where: { businessId },
    });
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `INV-${today}-${(count + 1).toString().padStart(3, '0')}-${randomHex}`;
  }

  /**
   * Process a sale (POS Checkout or Credit Sale):
   * Validates stock, decrements inventory, creates StockMovement (OUT),
   * creates Sale, linked Invoice, and Payment records in a single atomic transaction.
   */
  async create(businessId: string, currentUserId: string, dto: CreateSaleDto) {
    // 1. Verify customer if specified
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, businessId },
      });
      if (!customer) {
        throw new NotFoundException('Selected customer not found in this business');
      }
    }

    // 2. Validate line items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('A sale must contain at least one item');
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more selected products not found in catalog');
    }

    // 3. Stock sufficiency check
    for (const item of dto.items) {
      const prod = products.find((p) => p.id === item.productId)!;
      if (prod.currentStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${prod.name}". Available: ${prod.currentStock} ${prod.unit}, requested: ${item.quantity} ${prod.unit}.`,
        );
      }
    }

    // 4. Financial Calculations
    const itemRows = dto.items.map((i) => {
      const lineTotal = Math.round(i.quantity * i.unitPrice * 100) / 100;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: lineTotal,
      };
    });

    const subtotal = Math.round(itemRows.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const discount = Math.round((dto.discount || 0) * 100) / 100;
    const tax = Math.round((dto.tax || 0) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100);

    // 5. Payment & Status evaluation
    const paymentAmount = dto.payment && dto.payment.amount > 0 ? dto.payment.amount : 0;
    let status: InvoiceStatus = InvoiceStatus.UNPAID;
    if (paymentAmount >= total) {
      status = InvoiceStatus.PAID;
    } else if (paymentAmount > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    }

    // 6. Sale Number
    let saleNumber = dto.saleNumber ? dto.saleNumber.trim().toUpperCase() : null;
    if (saleNumber) {
      const existing = await this.prisma.sale.findUnique({
        where: { saleNumber },
      });
      if (existing) {
        throw new ConflictException(`Sale number ${saleNumber} already exists`);
      }
    } else {
      saleNumber = await this.generateSaleNumber(businessId);
    }

    const saleDate = dto.saleDate ? new Date(dto.saleDate) : new Date();

    // 7. Atomic transaction
    return this.prisma.$transaction(async (tx) => {
      // Create Sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          customerId: dto.customerId || null,
          saleNumber,
          saleDate,
          subtotal,
          discount,
          tax,
          total,
          status,
          notes: dto.notes ? dto.notes.trim() : null,
          createdById: currentUserId,
          items: {
            create: itemRows,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unit: true,
                  currentStock: true,
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
      });

      // Decrement stock & record StockMovement (OUT) for each sold item
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            reason: `Sale ${saleNumber}`,
            referenceId: saleNumber,
            createdById: currentUserId,
          },
        });
      }

      // Create linked Invoice if requested (default: true)
      let invoice = null;
      if (dto.createInvoice !== false) {
        const invoiceNumber = await this.generateInvoiceNumber(businessId);
        invoice = await tx.invoice.create({
          data: {
            businessId,
            saleId: sale.id,
            invoiceNumber,
            issueDate: saleDate,
            subtotal,
            discount,
            tax,
            total,
            status,
          },
        });
      }

      // Record Payment if tendered
      let paymentRecord = null;
      if (paymentAmount > 0 && dto.payment) {
        paymentRecord = await tx.payment.create({
          data: {
            businessId,
            saleId: sale.id,
            invoiceId: invoice?.id || null,
            amount: paymentAmount,
            paymentMethod: dto.payment.paymentMethod,
            reference: dto.payment.reference ? dto.payment.reference.trim() : null,
            notes: dto.payment.notes ? dto.payment.notes.trim() : null,
            recordedById: currentUserId,
          },
        });
      }

      return {
        ...sale,
        invoice,
        payments: paymentRecord ? [paymentRecord] : [],
        paidAmount: paymentAmount,
        balanceDue: Math.max(0, total - paymentAmount),
      };
    });
  }

  /**
   * Paginated list of sales with filters
   */
  async findAll(businessId: string, query: QuerySalesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      businessId,
    };

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.saleDate = {};
      if (query.startDate) {
        where.saleDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { saleNumber: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { invoice: { invoiceNumber: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        orderBy: [{ saleDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
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
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              paymentMethod: true,
              paymentDate: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    const enriched = items.map((s) => {
      const paidAmount = s.payments.reduce((sum, pay) => sum + pay.amount, 0);
      const balanceDue = Math.max(0, s.total - paidAmount);
      return {
        ...s,
        paidAmount,
        balanceDue,
        itemsCount: s.items.length,
        totalUnits: s.items.reduce((sum, i) => sum + i.quantity, 0),
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
   * Find single sale detail
   */
  async findOne(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
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
                sellingPrice: true,
                costPrice: true,
              },
            },
          },
        },
        invoice: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            recordedBy: {
              select: {
                firstName: true,
                lastName: true,
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
    });

    if (!sale) {
      throw new NotFoundException('Sale record not found');
    }

    const paidAmount = sale.payments.reduce((sum, pay) => sum + pay.amount, 0);
    const balanceDue = Math.max(0, sale.total - paidAmount);

    return {
      ...sale,
      paidAmount,
      balanceDue,
      itemsCount: sale.items.length,
      totalUnits: sale.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  /**
   * Cancel sale and return goods to inventory
   */
  async cancel(businessId: string, currentUserId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        invoice: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('This sale is already cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert stock for each sold line item
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.IN,
            quantity: item.quantity,
            reason: `Cancelled Sale ${sale.saleNumber} - Restock`,
            referenceId: sale.saleNumber,
            createdById: currentUserId,
          },
        });
      }

      // Update Sale status to CANCELLED
      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: { status: InvoiceStatus.CANCELLED },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      // Update linked Invoice if exists
      if (sale.invoice) {
        await tx.invoice.update({
          where: { id: sale.invoice.id },
          data: { status: InvoiceStatus.CANCELLED },
        });
      }

      return updatedSale;
    });
  }

  /**
   * Executive Sales KPIs
   */
  async getStats(businessId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sales, todaySales] = await Promise.all([
      this.prisma.sale.findMany({
        where: { businessId },
        include: {
          payments: { select: { amount: true } },
          items: { select: { quantity: true } },
        },
      }),
      this.prisma.sale.findMany({
        where: {
          businessId,
          saleDate: { gte: todayStart },
          status: { not: InvoiceStatus.CANCELLED },
        },
        select: { total: true },
      }),
    ]);

    const nonCancelled = sales.filter((s) => s.status !== InvoiceStatus.CANCELLED);
    const totalOrders = sales.length;
    const totalRevenue = nonCancelled.reduce((sum, s) => sum + s.total, 0);
    const totalUnitsSold = nonCancelled.reduce(
      (sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0),
      0,
    );

    let totalCollected = 0;
    for (const s of nonCancelled) {
      for (const p of s.payments) {
        totalCollected += p.amount;
      }
    }

    const outstandingReceivables = Math.max(0, totalRevenue - totalCollected);
    const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayCount = todaySales.length;

    return {
      totalOrders,
      totalRevenue,
      totalUnitsSold,
      totalCollected,
      outstandingReceivables,
      today: {
        count: todayCount,
        revenue: todayRevenue,
      },
    };
  }
}
