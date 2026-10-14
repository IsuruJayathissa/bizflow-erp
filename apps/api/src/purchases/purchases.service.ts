import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { QueryPurchasesDto } from './dto/query-purchases.dto';
import { PurchaseStatus, StockMovementType, Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to generate unique human-readable PO number: PO-YYYYMMDD-XXXX
   */
  private async generateOrderNumber(businessId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchase.count({
      where: { businessId },
    });
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    return `PO-${today}-${(count + 1).toString().padStart(3, '0')}-${randomHex}`;
  }

  /**
   * Create a new purchase order with items.
   * If status is immediately RECEIVED, goods are added to stock with StockMovement logs.
   */
  async create(
    businessId: string,
    currentUserId: string,
    dto: CreatePurchaseDto,
  ) {
    // 1. Verify supplier exists in business
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, businessId },
    });
    if (!supplier) {
      throw new NotFoundException('Selected supplier not found in this business');
    }

    // 2. Validate items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase order must contain at least one item');
    }

    const productIds = dto.items.map((i) => i.productId);
    const existingProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
      },
    });

    if (existingProducts.length !== productIds.length) {
      throw new BadRequestException(
        'One or more selected products do not exist in this business catalog',
      );
    }

    // 3. Compute item totals & grand total
    const itemRows = dto.items.map((i) => {
      const lineTotal = Math.round(i.quantity * i.unitCost * 100) / 100;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitCost: i.unitCost,
        total: lineTotal,
      };
    });

    const subtotal = Math.round(itemRows.reduce((sum, i) => sum + i.total, 0) * 100) / 100;
    const discount = Math.round((dto.discount || 0) * 100) / 100;
    const tax = Math.round((dto.tax || 0) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100);

    // 4. Handle order number
    let orderNumber = dto.orderNumber ? dto.orderNumber.trim().toUpperCase() : null;
    if (orderNumber) {
      const existing = await this.prisma.purchase.findUnique({
        where: { orderNumber },
      });
      if (existing) {
        throw new ConflictException(`Order number ${orderNumber} is already taken`);
      }
    } else {
      orderNumber = await this.generateOrderNumber(businessId);
    }

    const initialStatus = dto.status || PurchaseStatus.PENDING;
    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();

    // 5. Transaction execution
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          businessId,
          supplierId: dto.supplierId,
          orderNumber,
          purchaseDate,
          subtotal,
          discount,
          tax,
          total,
          status: initialStatus,
          notes: dto.notes ? dto.notes.trim() : null,
          createdById: currentUserId,
          items: {
            create: itemRows,
          },
        },
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
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
                  currentStock: true,
                  costPrice: true,
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

      // If created directly as RECEIVED, update inventory and ledger
      if (initialStatus === PurchaseStatus.RECEIVED) {
        for (const item of dto.items) {
          // Increment stock & update cost price
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: item.quantity },
              costPrice: item.unitCost,
            },
          });

          // Create stock movement ledger entry
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.IN,
              quantity: item.quantity,
              reason: `Goods Received against PO ${orderNumber}`,
              referenceId: orderNumber,
              createdById: currentUserId,
            },
          });
        }
      }

      return purchase;
    });
  }

  /**
   * Mark a PENDING purchase order as RECEIVED, incrementing stock and creating movements.
   */
  async receive(businessId: string, currentUserId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, businessId },
      include: {
        items: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new BadRequestException('This purchase order has already been received');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException('Cannot receive a cancelled purchase order');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update status
      const updated = await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.RECEIVED },
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
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
                  currentStock: true,
                  costPrice: true,
                },
              },
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
      });

      // 2. Increment stock and record movement for each item
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            costPrice: item.unitCost,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.IN,
            quantity: item.quantity,
            reason: `Goods Received against PO ${purchase.orderNumber}`,
            referenceId: purchase.orderNumber,
            createdById: currentUserId,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Cancel a purchase order.
   * If already received, validates stock is available and safely reverts.
   */
  async cancel(businessId: string, currentUserId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchase.status === PurchaseStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is already cancelled');
    }

    if (purchase.payments && purchase.payments.length > 0) {
      throw new BadRequestException(
        'Cannot cancel a purchase order with recorded payments. Please void or refund payments first.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If received, revert inventory
      if (purchase.status === PurchaseStatus.RECEIVED) {
        for (const item of purchase.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product || product.currentStock < item.quantity) {
            throw new BadRequestException(
              `Cannot cancel order: Stock for "${product?.name || 'Product'}" is ${product?.currentStock || 0}, cannot deduct ${item.quantity}. Items may have already been sold.`,
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: StockMovementType.OUT,
              quantity: item.quantity,
              reason: `Reverted Stock - Cancelled PO ${purchase.orderNumber}`,
              referenceId: purchase.orderNumber,
              createdById: currentUserId,
            },
          });
        }
      }

      return tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.CANCELLED },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  /**
   * Get paginated list of purchases with filtering and search
   */
  async findAll(businessId: string, query: QueryPurchasesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      businessId,
    };

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.purchaseDate = {};
      if (query.startDate) {
        where.purchaseDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { notes: { contains: term, mode: 'insensitive' } },
        { supplier: { companyName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: [{ purchaseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
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
      this.prisma.purchase.count({ where }),
    ]);

    const enriched = items.map((p) => {
      const paidAmount = p.payments.reduce((sum, pay) => sum + pay.amount, 0);
      const balanceDue = Math.max(0, p.total - paidAmount);
      return {
        ...p,
        paidAmount,
        balanceDue,
        itemsCount: p.items.length,
        totalUnits: p.items.reduce((sum, i) => sum + i.quantity, 0),
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
   * Find single purchase order by ID
   */
  async findOne(businessId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, businessId },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                unit: true,
                currentStock: true,
                costPrice: true,
                sellingPrice: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            business: {
              select: { name: true, currency: true },
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

    if (!purchase) {
      throw new NotFoundException('Purchase order not found');
    }

    const paidAmount = purchase.payments.reduce((sum, pay) => sum + pay.amount, 0);
    const balanceDue = Math.max(0, purchase.total - paidAmount);

    return {
      ...purchase,
      paidAmount,
      balanceDue,
      itemsCount: purchase.items.length,
      totalUnits: purchase.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }

  /**
   * High-level purchase spend and receiving KPIs
   */
  async getStats(businessId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { businessId },
      include: {
        payments: {
          select: { amount: true },
        },
      },
    });

    const nonCancelled = purchases.filter((p) => p.status !== PurchaseStatus.CANCELLED);
    const totalOrders = purchases.length;
    const totalSpend = nonCancelled.reduce((sum, p) => sum + p.total, 0);

    const pendingOrders = purchases.filter((p) => p.status === PurchaseStatus.PENDING).length;
    const receivedOrders = purchases.filter(
      (p) =>
        p.status === PurchaseStatus.RECEIVED ||
        p.status === PurchaseStatus.PAID ||
        p.status === PurchaseStatus.PARTIALLY_PAID,
    ).length;
    const cancelledOrders = purchases.filter((p) => p.status === PurchaseStatus.CANCELLED).length;

    let totalPaid = 0;
    for (const p of purchases) {
      for (const pay of p.payments) {
        totalPaid += pay.amount;
      }
    }

    const totalOutstandingPayables = Math.max(0, totalSpend - totalPaid);

    return {
      totalOrders,
      totalSpend,
      pendingOrders,
      receivedOrders,
      cancelledOrders,
      totalPaid,
      totalOutstandingPayables,
    };
  }

  /**
   * Delete a pending purchase order (not allowed if received or has payments)
   */
  async delete(businessId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, businessId },
      include: { payments: true },
    });

    if (!purchase) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchase.status === PurchaseStatus.RECEIVED) {
      throw new BadRequestException(
        'Cannot delete a received purchase order. Use cancel to reverse inventory if needed.',
      );
    }

    if (purchase.payments && purchase.payments.length > 0) {
      throw new BadRequestException('Cannot delete an order with payment records');
    }

    await this.prisma.purchase.delete({
      where: { id: purchase.id },
    });

    return { success: true, message: 'Purchase order deleted successfully' };
  }
}
