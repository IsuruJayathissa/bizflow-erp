import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto, StockStatusFilter } from './dto/query-products.dto';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, currentUserId: string, dto: CreateProductDto) {
    const sku = dto.sku.trim().toUpperCase();

    const existingSku = await this.prisma.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      throw new ConflictException('A product with this SKU already exists');
    }

    if (dto.barcode && dto.barcode.trim()) {
      const barcode = dto.barcode.trim();
      const existingBarcode = await this.prisma.product.findFirst({
        where: { businessId, barcode },
      });
      if (existingBarcode) {
        throw new ConflictException(
          'A product with this barcode already exists in this business',
        );
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, businessId },
      });
      if (!category) {
        throw new NotFoundException('Selected category not found');
      }
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, businessId },
      });
      if (!supplier) {
        throw new NotFoundException('Selected supplier not found');
      }
    }

    const initialStock = dto.currentStock !== undefined ? dto.currentStock : 0;

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name.trim(),
        sku,
        barcode: dto.barcode ? dto.barcode.trim() : null,
        description: dto.description ? dto.description.trim() : null,
        costPrice: dto.costPrice,
        sellingPrice: dto.sellingPrice,
        currentStock: initialStock,
        minStock: dto.minStock !== undefined ? dto.minStock : 5,
        unit: dto.unit ? dto.unit.trim() : 'units',
        categoryId: dto.categoryId || null,
        supplierId: dto.supplierId || null,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, companyName: true },
        },
      },
    });

    if (initialStock > 0) {
      await this.prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: StockMovementType.IN,
          quantity: initialStock,
          reason: 'Initial Inventory Setup',
          createdById: currentUserId,
        },
      });
    }

    const margin = product.sellingPrice - product.costPrice;
    const marginPercent =
      product.sellingPrice > 0
        ? Math.round((margin / product.sellingPrice) * 100 * 10) / 10
        : 0;

    return {
      ...product,
      margin,
      marginPercent,
      stockStatus:
        product.currentStock === 0
          ? 'OUT_OF_STOCK'
          : product.currentStock <= product.minStock
          ? 'LOW_STOCK'
          : 'IN_STOCK',
      inventoryValue: product.currentStock * product.costPrice,
    };
  }

  async findAll(businessId: string, query: QueryProductsDto) {
    const where: any = { businessId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.supplierId) {
      where.supplierId = query.supplierId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parent: {
              select: { id: true, name: true },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    const enriched = products.map((p) => {
      const margin = p.sellingPrice - p.costPrice;
      const marginPercent =
        p.sellingPrice > 0
          ? Math.round((margin / p.sellingPrice) * 100 * 10) / 10
          : 0;
      const stockStatus =
        p.currentStock === 0
          ? 'OUT_OF_STOCK'
          : p.currentStock <= p.minStock
          ? 'LOW_STOCK'
          : 'IN_STOCK';

      return {
        ...p,
        margin,
        marginPercent,
        stockStatus,
        inventoryValue: p.currentStock * p.costPrice,
        potentialRevenue: p.currentStock * p.sellingPrice,
      };
    });

    if (query.stockStatus && query.stockStatus !== StockStatusFilter.ALL) {
      return enriched.filter((p) => p.stockStatus === query.stockStatus);
    }

    return enriched;
  }

  async getStats(businessId: string) {
    const products = await this.prisma.product.findMany({
      where: { businessId },
      select: {
        currentStock: true,
        minStock: true,
        costPrice: true,
        sellingPrice: true,
        isActive: true,
      },
    });

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const totalInventoryValue = products.reduce(
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

    return {
      totalProducts,
      activeProducts,
      totalInventoryValue,
      potentialRevenue,
      lowStockCount,
      outOfStockCount,
    };
  }

  async findByBarcode(businessId: string, barcode: string) {
    const cleanBarcode = barcode.trim();
    const product = await this.prisma.product.findFirst({
      where: { businessId, barcode: cleanBarcode },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, companyName: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`No product found with barcode ${cleanBarcode}`);
    }

    const margin = product.sellingPrice - product.costPrice;
    const marginPercent =
      product.sellingPrice > 0
        ? Math.round((margin / product.sellingPrice) * 100 * 10) / 10
        : 0;

    return {
      ...product,
      margin,
      marginPercent,
      stockStatus:
        product.currentStock === 0
          ? 'OUT_OF_STOCK'
          : product.currentStock <= product.minStock
          ? 'LOW_STOCK'
          : 'IN_STOCK',
      inventoryValue: product.currentStock * product.costPrice,
    };
  }

  async findOne(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parent: {
              select: { id: true, name: true },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            companyName: true,
            phone: true,
            email: true,
          },
        },
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            saleItems: true,
            purchaseItems: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product record not found');
    }

    const margin = product.sellingPrice - product.costPrice;
    const marginPercent =
      product.sellingPrice > 0
        ? Math.round((margin / product.sellingPrice) * 100 * 10) / 10
        : 0;

    return {
      ...product,
      margin,
      marginPercent,
      stockStatus:
        product.currentStock === 0
          ? 'OUT_OF_STOCK'
          : product.currentStock <= product.minStock
          ? 'LOW_STOCK'
          : 'IN_STOCK',
      inventoryValue: product.currentStock * product.costPrice,
      totalSalesCount: product._count.saleItems,
      totalPurchasesCount: product._count.purchaseItems,
    };
  }

  async update(businessId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product record not found');
    }

    if (dto.sku && dto.sku.trim().toUpperCase() !== product.sku) {
      const sku = dto.sku.trim().toUpperCase();
      const existingSku = await this.prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException('Another product already has this SKU');
      }
    }

    if (
      dto.barcode &&
      dto.barcode.trim() !== product.barcode &&
      dto.barcode.trim() !== ''
    ) {
      const barcode = dto.barcode.trim();
      const existingBarcode = await this.prisma.product.findFirst({
        where: { businessId, barcode, id: { not: id } },
      });
      if (existingBarcode) {
        throw new ConflictException(
          'Another product already has this barcode in this business',
        );
      }
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, businessId },
      });
      if (!category) {
        throw new NotFoundException('Selected category not found');
      }
    }

    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, businessId },
      });
      if (!supplier) {
        throw new NotFoundException('Selected supplier not found');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.sku !== undefined && { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.barcode !== undefined && {
          barcode: dto.barcode ? dto.barcode.trim() : null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description ? dto.description.trim() : null,
        }),
        ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
        ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
        ...(dto.currentStock !== undefined && { currentStock: dto.currentStock }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(dto.unit !== undefined && { unit: dto.unit.trim() }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, companyName: true },
        },
      },
    });
  }

  async toggleActive(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product record not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: !product.isActive,
      },
    });
  }

  async delete(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product record not found');
    }

    const [saleItemsCount, purchaseItemsCount] = await Promise.all([
      this.prisma.saleItem.count({ where: { productId: id } }),
      this.prisma.purchaseItem.count({ where: { productId: id } }),
    ]);

    if (saleItemsCount > 0 || purchaseItemsCount > 0) {
      throw new BadRequestException(
        `Cannot delete product with existing transaction records (${saleItemsCount} sales, ${purchaseItemsCount} purchases). Please archive this product instead to protect accounting history.`,
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }
}
