import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BizFlow ERP database seeding...');

  // Create Business
  const business = await prisma.business.create({
    data: {
      name: 'Apex Autocare & Parts Ltd',
      address: '124 Galle Road, Colombo 03, Sri Lanka',
      phone: '+94 11 234 5678',
      email: 'info@apexautocare.lk',
      currency: 'LKR',
      taxRate: 15.0,
      invoicePrefix: 'INV-',
    },
  });

  console.log(`✅ Business created: ${business.name}`);

  // Create Admin User
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      businessId: business.id,
      email: 'admin@bizflow.com',
      passwordHash: passwordHash,
      firstName: 'Isuru',
      lastName: 'Jayathissa',
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Admin user seeded: ${admin.email} (Password: Admin@123)`);

  // Create Sample Categories
  const category1 = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Lubricants & Fluids',
      description: 'Engine oils, brake fluids, and coolants',
    },
  });

  const category2 = await prisma.category.create({
    data: {
      businessId: business.id,
      name: 'Braking Systems',
      description: 'Brake pads, rotors, and calipers',
    },
  });

  // Create Sample Supplier
  const supplier = await prisma.supplier.create({
    data: {
      businessId: business.id,
      companyName: 'Castrol Industrial Lanka',
      contactPerson: 'Kasun Silva',
      phone: '+94 77 123 4567',
      email: 'orders@castrollanka.com',
      address: 'Industrial Zone, Biyagama',
    },
  });

  // Create Sample Products
  await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: category1.id,
      supplierId: supplier.id,
      name: 'Castrol EDGE 5W-40 4L',
      sku: 'OIL-CAS-5W40-4L',
      barcode: '8901234567890',
      description: 'Full synthetic advanced engine oil',
      costPrice: 8500,
      sellingPrice: 11200,
      currentStock: 35,
      minStock: 10,
      unit: 'bottles',
    },
  });

  await prisma.product.create({
    data: {
      businessId: business.id,
      categoryId: category2.id,
      name: 'Brembo Ceramic Front Brake Pads',
      sku: 'BRK-BREM-FRONT-01',
      barcode: '8901234567891',
      description: 'High performance ceramic brake pads set',
      costPrice: 14500,
      sellingPrice: 18900,
      currentStock: 4, // Below minStock to test alert
      minStock: 8,
      unit: 'sets',
    },
  });

  console.log('✅ Sample categories, supplier, and products seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
