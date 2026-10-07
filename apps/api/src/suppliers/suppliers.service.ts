import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { PurchaseStatus } from '@prisma/client';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateSupplierDto) {
    const normalizedName = dto.companyName.trim();

    const existingName = await this.prisma.supplier.findFirst({
      where: {
        businessId,
        companyName: { equals: normalizedName, mode: 'insensitive' },
      },
    });

    if (existingName) {
      throw new ConflictException('A supplier with this company name already exists');
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingEmail = await this.prisma.supplier.findFirst({
        where: {
          businessId,
          email: { equals: normalizedEmail, mode: 'insensitive' },
        },
      });

      if (existingEmail) {
        throw new ConflictException('A supplier with this email address already exists');
      }
    }

    return this.prisma.supplier.create({
      data: {
        businessId,
        companyName: normalizedName,
        contactPerson: dto.contactPerson ? dto.contactPerson.trim() : null,
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        phone: dto.phone ? dto.phone.trim() : null,
        address: dto.address ? dto.address.trim() : null,
        notes: dto.notes ? dto.notes.trim() : null,
        isActive: true,
      },
    });
  }

  async findAll(businessId: string, query: QuerySuppliersDto) {
    const where: any = { businessId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { companyName: { contains: term, mode: 'insensitive' } },
        { contactPerson: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const suppliers = await this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            purchases: true,
            products: true,
          },
        },
        purchases: {
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

    return suppliers.map((s) => {
      const totalOrders = s._count.purchases;
      const productsCount = s._count.products;
      const totalPurchases = s.purchases.reduce((sum, p) => sum + (p.total || 0), 0);

      const outstandingDues = s.purchases.reduce((sum, p) => {
        if (p.status === PurchaseStatus.PAID || p.status === PurchaseStatus.CANCELLED) {
          return sum;
        }
        const paidAmount = p.payments.reduce((pSum, pay) => pSum + (pay.amount || 0), 0);
        const unpaid = Math.max(0, (p.total || 0) - paidAmount);
        return sum + unpaid;
      }, 0);

      const { purchases, _count, ...supplierData } = s;
      return {
        ...supplierData,
        totalOrders,
        productsCount,
        totalPurchases,
        outstandingDues,
      };
    });
  }

  async getStats(businessId: string) {
    const [totalSuppliers, activeSuppliers, totalSuppliedProducts, purchases] =
      await Promise.all([
        this.prisma.supplier.count({ where: { businessId } }),
        this.prisma.supplier.count({ where: { businessId, isActive: true } }),
        this.prisma.product.count({
          where: { businessId, supplierId: { not: null } },
        }),
        this.prisma.purchase.findMany({
          where: { businessId },
          select: {
            total: true,
            status: true,
            payments: {
              select: { amount: true },
            },
          },
        }),
      ]);

    const totalPurchasesAmount = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
    const accountsPayable = purchases.reduce((sum, p) => {
      if (p.status === PurchaseStatus.PAID || p.status === PurchaseStatus.CANCELLED) {
        return sum;
      }
      const paid = p.payments.reduce((pSum, pay) => pSum + (pay.amount || 0), 0);
      return sum + Math.max(0, (p.total || 0) - paid);
    }, 0);

    return {
      totalSuppliers,
      activeSuppliers,
      totalPurchasesAmount,
      accountsPayable,
      totalSuppliedProducts,
    };
  }

  async findOne(businessId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            sellingPrice: true,
            currentStock: true,
            unit: true,
          },
        },
        purchases: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
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
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier record not found');
    }

    const totalOrders = supplier.purchases.length;
    const productsCount = supplier.products.length;
    const totalPurchases = supplier.purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const outstandingDues = supplier.purchases.reduce((sum, p) => {
      if (p.status === PurchaseStatus.PAID || p.status === PurchaseStatus.CANCELLED) {
        return sum;
      }
      const paid = p.payments.reduce((pSum, pay) => pSum + (pay.amount || 0), 0);
      return sum + Math.max(0, (p.total || 0) - paid);
    }, 0);

    return {
      ...supplier,
      totalOrders,
      productsCount,
      totalPurchases,
      outstandingDues,
    };
  }

  async update(businessId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier record not found');
    }

    if (
      dto.companyName &&
      dto.companyName.trim().toLowerCase() !== supplier.companyName.toLowerCase()
    ) {
      const normalizedName = dto.companyName.trim();
      const existing = await this.prisma.supplier.findFirst({
        where: {
          businessId,
          companyName: { equals: normalizedName, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Another supplier already has this company name');
      }
    }

    if (
      dto.email &&
      dto.email.trim().toLowerCase() !== supplier.email?.toLowerCase()
    ) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.prisma.supplier.findFirst({
        where: {
          businessId,
          email: { equals: normalizedEmail, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Another supplier already has this email address');
      }
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName.trim() }),
        ...(dto.contactPerson !== undefined && {
          contactPerson: dto.contactPerson ? dto.contactPerson.trim() : null,
        }),
        ...(dto.email !== undefined && {
          email: dto.email ? dto.email.trim().toLowerCase() : null,
        }),
        ...(dto.phone !== undefined && {
          phone: dto.phone ? dto.phone.trim() : null,
        }),
        ...(dto.address !== undefined && {
          address: dto.address ? dto.address.trim() : null,
        }),
        ...(dto.notes !== undefined && {
          notes: dto.notes ? dto.notes.trim() : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async toggleActive(businessId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier record not found');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: {
        isActive: !supplier.isActive,
      },
    });
  }

  async delete(businessId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, businessId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier record not found');
    }

    const [purchasesCount, productsCount] = await Promise.all([
      this.prisma.purchase.count({ where: { businessId, supplierId: id } }),
      this.prisma.product.count({ where: { businessId, supplierId: id } }),
    ]);

    if (purchasesCount > 0 || productsCount > 0) {
      throw new BadRequestException(
        `Cannot delete supplier with existing purchase orders (${purchasesCount}) or linked catalog products (${productsCount}). Please archive this supplier instead.`,
      );
    }

    await this.prisma.supplier.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Supplier successfully deleted',
    };
  }
}
