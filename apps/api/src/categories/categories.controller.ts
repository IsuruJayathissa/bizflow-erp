import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Category Taxonomy Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Create a new product category or subcategory' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(businessId, createCategoryDto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List all categories with parent references and product counts' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryCategoriesDto,
  ) {
    return this.categoriesService.findAll(businessId, query);
  }

  @Get('tree')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get hierarchical category tree with nested children' })
  async getTree(@CurrentUser('businessId') businessId: string) {
    return this.categoriesService.getTree(businessId);
  }

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get category taxonomy statistics (roots, sub-tiers, categorized products)' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.categoriesService.getStats(businessId);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get category profile with subcategories and catalog products' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Update category details or move to another parent tier' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(businessId, id, updateCategoryDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Toggle category active/archived status' })
  async toggleActive(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.toggleActive(businessId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a category (only if no products or subcategories exist)' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.categoriesService.delete(businessId, id);
  }
}
