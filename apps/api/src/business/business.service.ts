import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async getBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            customers: true,
            suppliers: true,
            sales: true,
            purchases: true,
          },
        },
      },
    });

    if (!business) {
      throw new NotFoundException('Business profile not found');
    }

    return business;
  }

  async updateBusiness(businessId: string, updateBusinessDto: UpdateBusinessDto) {
    // Verify business exists
    await this.getBusiness(businessId);

    const updated = await this.prisma.business.update({
      where: { id: businessId },
      data: updateBusinessDto,
      include: {
        _count: {
          select: {
            users: true,
            products: true,
            customers: true,
            suppliers: true,
            sales: true,
            purchases: true,
          },
        },
      },
    });

    return updated;
  }
}
