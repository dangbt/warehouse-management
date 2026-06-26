import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Departments
  const departments = await Promise.all([
    prisma.department.create({ data: { name: 'Quản lý', code: 'MANAGER' } }),
    prisma.department.create({ data: { name: 'Kho', code: 'WAREHOUSE' } }),
    prisma.department.create({ data: { name: 'Bếp', code: 'KITCHEN' } }),
    prisma.department.create({ data: { name: 'Bar', code: 'BAR' } }),
    prisma.department.create({ data: { name: 'Phục vụ', code: 'SERVICE' } }),
    prisma.department.create({ data: { name: 'Thu ngân', code: 'CASHIER' } }),
    prisma.department.create({ data: { name: 'Kế toán', code: 'ACCOUNTANT' } }),
  ]);

  // Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      code: 'admin',
      permissions: {
        create: [
          { resource: 'ingredients', action: 'create' },
          { resource: 'ingredients', action: 'read' },
          { resource: 'ingredients', action: 'update' },
          { resource: 'ingredients', action: 'delete' },
          { resource: 'import_orders', action: 'create' },
          { resource: 'import_orders', action: 'read' },
          { resource: 'import_orders', action: 'approve' },
          { resource: 'stock_exports', action: 'create' },
          { resource: 'stock_exports', action: 'read' },
          { resource: 'recipes', action: 'create' },
          { resource: 'recipes', action: 'read' },
          { resource: 'recipes', action: 'update' },
          { resource: 'users', action: 'create' },
          { resource: 'users', action: 'read' },
          { resource: 'users', action: 'update' },
          { resource: 'audit_logs', action: 'read' },
          { resource: 'suppliers', action: 'create' },
          { resource: 'suppliers', action: 'read' },
          { resource: 'suppliers', action: 'update' },
          { resource: 'kiotviet', action: 'read' },
          { resource: 'kiotviet', action: 'sync' },
          { resource: 'kiotviet', action: 'deduct' },
        ],
      },
    },
  });

  const warehouseRole = await prisma.role.create({
    data: {
      name: 'Warehouse Staff',
      code: 'warehouse_staff',
      permissions: {
        create: [
          { resource: 'ingredients', action: 'create' },
          { resource: 'ingredients', action: 'read' },
          { resource: 'ingredients', action: 'update' },
          { resource: 'import_orders', action: 'create' },
          { resource: 'import_orders', action: 'read' },
          { resource: 'stock_exports', action: 'create' },
          { resource: 'stock_exports', action: 'read' },
          { resource: 'suppliers', action: 'read' },
        ],
      },
    },
  });

  const kitchenRole = await prisma.role.create({
    data: {
      name: 'Kitchen Staff',
      code: 'kitchen_staff',
      permissions: {
        create: [
          { resource: 'ingredients', action: 'read' },
          { resource: 'recipes', action: 'create' },
          { resource: 'recipes', action: 'read' },
          { resource: 'recipes', action: 'update' },
        ],
      },
    },
  });

  // Users
  const hash = await bcrypt.hash('123456', 10);
  await prisma.user.create({
    data: {
      email: 'admin@wms.vn',
      passwordHash: hash,
      fullName: 'Nguyễn Văn A',
      departmentId: departments[0].id,
      userRoles: { create: { roleId: adminRole.id } },
    },
  });
  await prisma.user.create({
    data: {
      email: 'kho@wms.vn',
      passwordHash: hash,
      fullName: 'Trần Văn B',
      departmentId: departments[1].id,
      userRoles: { create: { roleId: warehouseRole.id } },
    },
  });
  await prisma.user.create({
    data: {
      email: 'bep@wms.vn',
      passwordHash: hash,
      fullName: 'Lê Thị C',
      departmentId: departments[2].id,
      userRoles: { create: { roleId: kitchenRole.id } },
    },
  });

  // Ingredients
  await prisma.ingredient.createMany({
    data: [
      { name: 'Thịt bò Úc', unit: 'kg', minStock: 5, currentStock: 12.5, costPerUnit: 450000, category: 'Thịt' },
      { name: 'Rau muống', unit: 'kg', minStock: 10, currentStock: 3, costPerUnit: 25000, category: 'Rau' },
      { name: 'Dầu ăn', unit: 'lít', minStock: 5, currentStock: 8, costPerUnit: 45000, category: 'Gia vị' },
      { name: 'Hành tím', unit: 'kg', minStock: 3, currentStock: 4.5, costPerUnit: 35000, category: 'Rau' },
      { name: 'Nước mắm', unit: 'lít', minStock: 2, currentStock: 6, costPerUnit: 60000, category: 'Gia vị' },
      { name: 'Bánh phở', unit: 'kg', minStock: 5, currentStock: 15, costPerUnit: 30000, category: 'Đồ khô' },
      { name: 'Nước dùng bò', unit: 'lít', minStock: 10, currentStock: 20, costPerUnit: 20000, category: 'Gia vị' },
    ],
  });

  // Suppliers
  await prisma.supplier.createMany({
    data: [
      { name: 'Cty TNHH ABC', phone: '0281234567', address: '123 Đường Lê Lợi, Q.1' },
      { name: 'Cty XYZ Foods', phone: '0287654321', address: '456 Nguyễn Huệ, Q.1' },
      { name: 'Chợ đầu mối Hóc Môn', phone: '0901234567', address: 'Hóc Môn, HCM' },
    ],
  });

  // Menu items + recipes
  const pho = await prisma.menuItem.create({ data: { name: 'Phở bò tái', price: 65000, category: 'Món chính' } });
  const ingredients = await prisma.ingredient.findMany();
  await prisma.recipe.create({
    data: {
      menuItemId: pho.id,
      name: 'Phở bò tái',
      servingSize: 1,
      ingredients: {
        create: [
          { ingredientId: ingredients.find((i) => i.name === 'Thịt bò Úc')!.id, quantity: 0.15, unit: 'kg' },
          { ingredientId: ingredients.find((i) => i.name === 'Bánh phở')!.id, quantity: 0.25, unit: 'kg' },
          { ingredientId: ingredients.find((i) => i.name === 'Nước dùng bò')!.id, quantity: 0.4, unit: 'lít' },
          { ingredientId: ingredients.find((i) => i.name === 'Hành tím')!.id, quantity: 0.02, unit: 'kg' },
        ],
      },
    },
  });

  console.log('✅ Seed completed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
