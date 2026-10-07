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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('User Administration & RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new staff user account (Admin only)' })
  @ApiResponse({ status: 201, description: 'Staff user created successfully' })
  async createUser(
    @CurrentUser('businessId') businessId: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createUser(businessId, createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all staff users within the business (Admin & Manager)' })
  async findAll(
    @CurrentUser('businessId') businessId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.usersService.findAll(businessId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get details of a specific user (Admin & Manager)' })
  async findOne(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user profile or change assigned role (Admin only)' })
  async update(
    @CurrentUser('businessId') businessId: string,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(businessId, id, updateUserDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle user active/inactive account status (Admin only)' })
  async toggleActive(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.toggleActive(businessId, id, currentUserId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user account (Admin only)' })
  async delete(
    @CurrentUser('businessId') businessId: string,
    @CurrentUser('id') currentUserId: string,
    @Param('id') id: string,
  ) {
    return this.usersService.delete(businessId, id, currentUserId);
  }
}
