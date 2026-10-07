import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, dto: CreateCategoryDto) {
    const normalizedName = dto.name.trim();

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, businessId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const existing = await this.prisma.category.findFirst({
      where: {
        businessId,
        name: { equals: normalizedName, mode: 'insensitive' },
        parentId: dto.parentId || null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A category with this name already exists in this hierarchy tier',
      );
    }

    return this.prisma.category.create({
      data: {
        businessId,
        name: normalizedName,
        description: dto.description ? dto.description.trim() : null,
        parentId: dto.parentId || null,
        isActive: true,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findAll(businessId: string, query: QueryCategoriesDto) {
    const where: any = { businessId };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.parentId) {
      if (query.parentId === 'root') {
        where.parentId = null;
      } else {
        where.parentId = query.parentId;
      }
    }

    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    return categories.map((c) => {
      const { _count, ...data } = c;
      return {
        ...data,
        productsCount: _count.products,
        subcategoriesCount: _count.children,
      };
    });
  }

  async getTree(businessId: string) {
    const all = await this.prisma.category.findMany({
      where: { businessId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    });

    const categoryMap = new Map<string, any>();
    all.forEach((c) => {
      categoryMap.set(c.id, {
        ...c,
        productsCount: c._count.products,
        subcategoriesCount: c._count.children,
        children: [],
      });
    });

    const tree: any[] = [];
    all.forEach((c) => {
      if (c.parentId && categoryMap.has(c.parentId)) {
        categoryMap.get(c.parentId).children.push(categoryMap.get(c.id));
      } else if (!c.parentId) {
        tree.push(categoryMap.get(c.id));
      }
    });

    return tree;
  }

  async getStats(businessId: string) {
    const [totalCategories, rootCategories, subCategories, categorizedProducts] =
      await Promise.all([
        this.prisma.category.count({ where: { businessId } }),
        this.prisma.category.count({ where: { businessId, parentId: null } }),
        this.prisma.category.count({
          where: { businessId, parentId: { not: null } },
        }),
        this.prisma.product.count({
          where: { businessId, categoryId: { not: null } },
        }),
      ]);

    return {
      totalCategories,
      rootCategories,
      subCategories,
      categorizedProducts,
    };
  }

  async findOne(businessId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
        products: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            sellingPrice: true,
            currentStock: true,
            unit: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { _count, ...data } = category;
    return {
      ...data,
      productsCount: _count.products,
      subcategoriesCount: _count.children,
    };
  }

  async update(businessId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, businessId },
      });
      if (!parent) {
        throw new NotFoundException('Target parent category not found');
      }
    }

    const newName = dto.name !== undefined ? dto.name.trim() : category.name;
    const newParentId =
      dto.parentId !== undefined ? dto.parentId : category.parentId;

    if (
      newName.toLowerCase() !== category.name.toLowerCase() ||
      newParentId !== category.parentId
    ) {
      const conflict = await this.prisma.category.findFirst({
        where: {
          businessId,
          name: { equals: newName, mode: 'insensitive' },
          parentId: newParentId,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          'A category with this name already exists in the selected hierarchy tier',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description ? dto.description.trim() : null,
        }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async toggleActive(businessId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        isActive: !category.isActive,
      },
    });
  }

  async delete(businessId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const [productsCount, childrenCount] = await Promise.all([
      this.prisma.product.count({ where: { businessId, categoryId: id } }),
      this.prisma.category.count({ where: { businessId, parentId: id } }),
    ]);

    if (productsCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${productsCount} associated product(s). Please reassign or delete products first, or archive this category.`,
      );
    }

    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${childrenCount} sub-category tier(s). Please reassign or delete child categories first.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
