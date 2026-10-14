import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockMovementDto,
  AdjustmentMode,
} from './dto/create-stock-movement.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { StockMovementType, Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a stock movement (IN, OUT, or ADJUSTMENT) with strict audit tracking
   */
  async recordMovement(
    businessId: string,
    currentUserId: string,
    dto: CreateStockMovementDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this business');
    }

    let newStock = product.currentStock;
    let movementQuantity = dto.quantity;

    if (dto.type === StockMovementType.IN) {
      if (dto.quantity <= 0) {
        throw new BadRequestException('Quantity for Stock IN must be greater than 0');
      }
      newStock = product.currentStock + dto.quantity;
      movementQuantity = dto.quantity;
    } else if (dto.type === StockMovementType.OUT) {
      if (dto.quantity <= 0) {
        throw new BadRequestException('Quantity for Stock OUT must be greater than 0');
      }
      if (product.currentStock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock to deduct ${dto.quantity}. Only ${product.currentStock} units currently available.`,
        );
      }
      newStock = product.currentStock - dto.quantity;
      movementQuantity = dto.quantity;
    } else if (dto.type === StockMovementType.ADJUSTMENT) {
      const mode = dto.adjustmentMode || AdjustmentMode.ADD;
      if (mode === AdjustmentMode.ADD) {
        if (dto.quantity <= 0) {
          throw new BadRequestException('Quantity to add must be greater than 0');
        }
        newStock = product.currentStock + dto.quantity;
        movementQuantity = dto.quantity;
      } else if (mode === AdjustmentMode.DEDUCT) {
        if (dto.quantity <= 0) {
          throw new BadRequestException('Quantity to deduct must be greater than 0');
        }
        if (product.currentStock < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock to deduct ${dto.quantity}. Current stock is ${product.currentStock}.`,
          );
        }
        newStock = product.currentStock - dto.quantity;
        movementQuantity = dto.quantity;
      } else if (mode === AdjustmentMode.RECONCILE) {
        if (dto.quantity < 0) {
          throw new BadRequestException('Target stock level cannot be negative');
        }
        const delta = dto.quantity - product.currentStock;
        newStock = dto.quantity;
        movementQuantity = Math.abs(delta);
      }
    }

    // Execute product stock update and ledger entry inside an atomic Prisma transaction
    const [updatedProduct, movement] = await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      }),
      this.prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: dto.type,
          quantity: movementQuantity,
          reason: dto.reason.trim(),
          referenceId: dto.referenceId ? dto.referenceId.trim() : null,
          createdById: currentUserId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
              costPrice: true,
              sellingPrice: true,
              currentStock: true,
              minStock: true,
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
      }),
    ]);

    return {
      movement,
      previousStock: product.currentStock,
      newStock: updatedProduct.currentStock,
      product: updatedProduct,
    };
  }

  /**
   * Get paginated audit ledger of all stock movements with filtering
   */
  async getMovements(businessId: string, query: QueryMovementsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      product: {
        businessId,
      },
    };

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.product = {
        businessId,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { sku: { contains: term, mode: 'insensitive' } },
          { barcode: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
              costPrice: true,
              sellingPrice: true,
              currentStock: true,
              minStock: true,
              category: {
                select: { id: true, name: true },
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
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get all active products that are at or below their reorder threshold
   */
  async getLowStockAlerts(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: [{ currentStock: 'asc' }, { name: 'asc' }],
    });

    const alerts = products
      .filter((p) => p.currentStock <= p.minStock)
      .map((p) => {
        const shortfall = Math.max(0, p.minStock - p.currentStock);
        const estimatedReorderCost = shortfall * p.costPrice;
        const status = p.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          unit: p.unit,
          currentStock: p.currentStock,
          minStock: p.minStock,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          shortfall,
          estimatedReorderCost,
          status,
          category: p.category,
          supplier: p.supplier,
          updatedAt: p.updatedAt,
        };
      });

    return alerts;
  }

  /**
   * Get executive inventory health metrics & movement volume
   */
  async getInventorySummary(businessId: string) {
    const [products, recentMovements] = await Promise.all([
      this.prisma.product.findMany({
        where: { businessId, isActive: true },
        select: {
          currentStock: true,
          minStock: true,
          costPrice: true,
          sellingPrice: true,
        },
      }),
      this.prisma.stockMovement.findMany({
        where: {
          product: { businessId },
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
          },
        },
        select: {
          type: true,
          quantity: true,
        },
      }),
    ]);

    const totalProducts = products.length;
    const totalStockUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
    const totalValuation = products.reduce(
      (sum, p) => sum + p.currentStock * p.costPrice,
      0,
    );
    const potentialRevenue = products.reduce(
      (sum, p) => sum + p.currentStock * p.sellingPrice,
      0,
    );
    const lowStockCount = products.filter(
      (p) => p.currentStock > 0 && p.currentStock <= p.minStock,
    ).length;
    const outOfStockCount = products.filter((p) => p.currentStock === 0).length;

    let movementsIn7Days = 0;
    let movementsOut7Days = 0;
    let adjustments7Days = 0;

    for (const m of recentMovements) {
      if (m.type === StockMovementType.IN) movementsIn7Days += m.quantity;
      else if (m.type === StockMovementType.OUT) movementsOut7Days += m.quantity;
      else if (m.type === StockMovementType.ADJUSTMENT) adjustments7Days += m.quantity;
    }

    return {
      totalProducts,
      totalStockUnits,
      totalValuation,
      potentialRevenue,
      lowStockCount,
      outOfStockCount,
      recentActivity: {
        totalMovementsCount: recentMovements.length,
        unitsIn7Days: movementsIn7Days,
        unitsOut7Days: movementsOut7Days,
        unitsAdjusted7Days: adjustments7Days,
      },
    };
  }
}
