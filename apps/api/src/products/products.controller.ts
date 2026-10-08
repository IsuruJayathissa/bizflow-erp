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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Product Catalog & Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Create a new product in the catalog with initial stock' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async create(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(businessId, currentUserId, createProductDto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'List all products with stock status and profit margins' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryProductsDto,
  ) {
    return this.productsService.findAll(businessId, query);
  }

  @Get('stats')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get catalog & inventory metrics (total value, low stock, out of stock)' })
  async getStats(@CurrentUser('businessId') businessId: string) {
    return this.productsService.getStats(businessId);
  }

  @Get('barcode/:barcode')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
  )
  @ApiOperation({ summary: 'Fast product lookup by barcode for POS and barcode scanners' })
  async findByBarcode(
    @CurrentUser('businessId') businessId: string,
    @Param('barcode') barcode: string,
  ) {
    return this.productsService.findByBarcode(businessId, barcode);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.INVENTORY_STAFF,
    UserRole.SALES_STAFF,
    UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Get full product details including recent stock movements' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Update product pricing, thresholds, or catalog details' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(businessId, id, updateProductDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.INVENTORY_STAFF)
  @ApiOperation({ summary: 'Toggle product active/archived status in catalog' })
  async toggleActive(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.toggleActive(businessId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete product (only if no sales or purchase history exists)' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.delete(businessId, id);
  }
}
