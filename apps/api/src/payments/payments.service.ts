import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { InvoiceStatus, PurchaseStatus, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a payment (Incoming customer collection or Outgoing supplier disbursement)
   * with automatic order and invoice status synchronization inside an atomic transaction.
   */
  async recordPayment(
    businessId: string,
    currentUserId: string,
    dto: RecordPaymentDto,
  ) {
    if (!dto.saleId && !dto.invoiceId && !dto.purchaseId) {
      throw new BadRequestException(
        'Payment must be linked to either a Sale, Invoice, or Purchase Order',
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      let resolvedSaleId = dto.saleId || null;
      let resolvedInvoiceId = dto.invoiceId || null;
      let resolvedPurchaseId = dto.purchaseId || null;

      // 1. Settle against Invoice
      if (dto.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: dto.invoiceId, businessId },
          include: {
            payments: { select: { amount: true } },
            sale: { select: { id: true } },
          },
        });

        if (!invoice) {
          throw new NotFoundException('Invoice not found in this business');
        }

        if (invoice.status === InvoiceStatus.CANCELLED) {
          throw new BadRequestException('Cannot record payment for a cancelled invoice');
        }

        const paidSoFar = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
        const newPaidTotal = paidSoFar + dto.amount;

        const newStatus =
          newPaidTotal >= invoice.total
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });

        if (invoice.sale) {
          await tx.sale.update({
            where: { id: invoice.sale.id },
            data: { status: newStatus },
          });
          resolvedSaleId = invoice.sale.id;
        }
      }
      // 2. Settle against Sale (if invoice not already handled)
      else if (dto.saleId) {
        const sale = await tx.sale.findFirst({
          where: { id: dto.saleId, businessId },
          include: {
            payments: { select: { amount: true } },
            invoice: { select: { id: true } },
          },
        });

        if (!sale) {
          throw new NotFoundException('Sale record not found');
        }

        if (sale.status === InvoiceStatus.CANCELLED) {
          throw new BadRequestException('Cannot record payment for a cancelled sale');
        }

        const paidSoFar = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const newPaidTotal = paidSoFar + dto.amount;

        const newStatus =
          newPaidTotal >= sale.total
            ? InvoiceStatus.PAID
            : InvoiceStatus.PARTIALLY_PAID;

        await tx.sale.update({
          where: { id: sale.id },
          data: { status: newStatus },
        });

        if (sale.invoice) {
          await tx.invoice.update({
            where: { id: sale.invoice.id },
            data: { status: newStatus },
          });
          resolvedInvoiceId = sale.invoice.id;
        }
      }
      // 3. Settle against Purchase Order (Supplier Disbursement)
      else if (dto.purchaseId) {
        const purchase = await tx.purchase.findFirst({
          where: { id: dto.purchaseId, businessId },
          include: {
            payments: { select: { amount: true } },
          },
        });

        if (!purchase) {
          throw new NotFoundException('Purchase order not found');
        }

        if (purchase.status === PurchaseStatus.CANCELLED) {
          throw new BadRequestException(
            'Cannot record payment for a cancelled purchase order',
          );
        }

        const paidSoFar = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const newPaidTotal = paidSoFar + dto.amount;

        const newStatus =
          newPaidTotal >= purchase.total
            ? PurchaseStatus.PAID
            : PurchaseStatus.PARTIALLY_PAID;

        await tx.purchase.update({
          where: { id: purchase.id },
          data: { status: newStatus },
        });
      }

      // 4. Create Payment ledger row
      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

      const payment = await tx.payment.create({
        data: {
          businessId,
          saleId: resolvedSaleId,
          invoiceId: resolvedInvoiceId,
          purchaseId: resolvedPurchaseId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paymentDate,
          reference: dto.reference ? dto.reference.trim() : null,
          notes: dto.notes ? dto.notes.trim() : null,
          recordedById: currentUserId,
        },
        include: {
          sale: {
            select: {
              id: true,
              saleNumber: true,
              customer: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, status: true },
          },
          purchase: {
            select: {
              id: true,
              orderNumber: true,
              supplier: {
                select: { id: true, companyName: true, phone: true },
              },
            },
          },
          recordedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      return payment;
    });
  }

  /**
   * Paginated ledger of all incoming & outgoing payments
   */
  async findAll(businessId: string, query: QueryPaymentsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      businessId,
    };

    if (query.type === 'INCOMING') {
      where.OR = [{ saleId: { not: null } }, { invoiceId: { not: null } }];
    } else if (query.type === 'OUTGOING') {
      where.purchaseId = { not: null };
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.saleId) {
      where.saleId = query.saleId;
    }

    if (query.invoiceId) {
      where.invoiceId = query.invoiceId;
    }

    if (query.purchaseId) {
      where.purchaseId = query.purchaseId;
    }

    if (query.startDate || query.endDate) {
      where.paymentDate = {};
      if (query.startDate) {
        where.paymentDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { reference: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { sale: { saleNumber: { contains: term, mode: 'insensitive' } } },
        { sale: { customer: { name: { contains: term, mode: 'insensitive' } } } },
        { invoice: { invoiceNumber: { contains: term, mode: 'insensitive' } } },
        { purchase: { orderNumber: { contains: term, mode: 'insensitive' } } },
        { purchase: { supplier: { companyName: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          sale: {
            select: {
              id: true,
              saleNumber: true,
              total: true,
              customer: {
                select: { id: true, name: true, phone: true },
              },
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
              status: true,
            },
          },
          purchase: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              supplier: {
                select: { id: true, companyName: true, phone: true },
              },
            },
          },
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const enriched = items.map((p) => {
      const isOutgoing = Boolean(p.purchaseId);
      const isIncoming = Boolean(p.saleId || p.invoiceId);
      const partyName = isOutgoing
        ? p.purchase?.supplier?.companyName || 'Supplier'
        : p.sale?.customer?.name || 'Walk-in Retail';

      return {
        ...p,
        direction: isOutgoing ? ('OUTGOING' as const) : ('INCOMING' as const),
        partyName,
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
   * Find single payment receipt / voucher details
   */
  async findOne(businessId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, businessId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            currency: true,
          },
        },
        sale: {
          include: {
            customer: true,
          },
        },
        invoice: true,
        purchase: {
          include: {
            supplier: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    const isOutgoing = Boolean(payment.purchaseId);
    return {
      ...payment,
      direction: isOutgoing ? ('OUTGOING' as const) : ('INCOMING' as const),
      partyName: isOutgoing
        ? payment.purchase?.supplier?.companyName || 'Supplier'
        : payment.sale?.customer?.name || 'Walk-in Retail',
    };
  }

  /**
   * Cash Flow & Payment Method Statistics
   */
  async getStats(businessId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const payments = await this.prisma.payment.findMany({
      where: { businessId },
      select: {
        amount: true,
        paymentMethod: true,
        paymentDate: true,
        purchaseId: true,
        saleId: true,
        invoiceId: true,
      },
    });

    let totalInflows = 0;
    let totalOutflows = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let bankTransferTotal = 0;
    let otherTotal = 0;
    let todayInflows = 0;
    let todayOutflows = 0;

    for (const p of payments) {
      const isOutgoing = Boolean(p.purchaseId);
      const isToday = new Date(p.paymentDate) >= todayStart;

      if (isOutgoing) {
        totalOutflows += p.amount;
        if (isToday) todayOutflows += p.amount;
      } else {
        totalInflows += p.amount;
        if (isToday) todayInflows += p.amount;
      }

      switch (p.paymentMethod) {
        case 'CASH':
          cashTotal += p.amount;
          break;
        case 'CARD':
          cardTotal += p.amount;
          break;
        case 'BANK_TRANSFER':
          bankTransferTotal += p.amount;
          break;
        default:
          otherTotal += p.amount;
          break;
      }
    }

    const netCashFlow = totalInflows - totalOutflows;

    return {
      totalPaymentsCount: payments.length,
      totalInflows,
      totalOutflows,
      netCashFlow,
      byMethod: {
        cash: cashTotal,
        card: cardTotal,
        bankTransfer: bankTransferTotal,
        other: otherTotal,
      },
      today: {
        inflows: todayInflows,
        outflows: todayOutflows,
        net: todayInflows - todayOutflows,
      },
    };
  }
}
