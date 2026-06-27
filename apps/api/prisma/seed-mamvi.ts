/**
 * Seed dữ liệu nguyên liệu Mâm Vị (từ file HÀNG TỒN MÂM VỊ 05/2026).
 * Idempotent: chạy lại sẽ cập nhật theo tên (name unique).
 *
 * Chạy: npm run db:seed:mamvi   (từ apps/api)
 *
 * Dữ liệu nằm ở prisma/seeds/mamvi-data.json:
 *  - groups: nhóm gom tồn (base_unit kg)
 *  - ingredients: name, unit, category, cost_per_unit, base_factor (định lượng → kg),
 *    group (tên nhóm), source (tên NL nguồn nếu là BTP), loss_ratio (hao hụt sơ chế)
 * Lưu ý: current_stock = 0 (không seed tồn). Gom nhóm/nguồn BTP suy đoán theo món "sống".
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SeedIngredient {
  name: string;
  unit: string;
  category: string;
  cost_per_unit: number;
  base_factor: number | null;
  group: string | null;
  source: string | null;
  loss_ratio: number | null;
}
interface SeedData {
  groups: { name: string; base_unit: string }[];
  ingredients: SeedIngredient[];
}

async function main() {
  const data: SeedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seeds', 'mamvi-data.json'), 'utf8'));

  // 1) Nhóm nguyên liệu
  for (const g of data.groups) {
    await prisma.ingredientGroup.upsert({
      where: { name: g.name },
      update: { baseUnit: g.base_unit },
      create: { name: g.name, baseUnit: g.base_unit },
    });
  }
  const groupId = Object.fromEntries((await prisma.ingredientGroup.findMany()).map((g) => [g.name, g.id]));

  // 2) Nguyên liệu (current_stock = 0)
  for (const i of data.ingredients) {
    await prisma.ingredient.upsert({
      where: { name: i.name },
      update: {
        unit: i.unit,
        category: i.category,
        costPerUnit: i.cost_per_unit,
        baseFactor: i.base_factor,
        lossRatio: i.loss_ratio,
        groupId: i.group ? groupId[i.group] : null,
      },
      create: {
        name: i.name,
        unit: i.unit,
        category: i.category,
        currentStock: 0,
        minStock: 0,
        costPerUnit: i.cost_per_unit,
        baseFactor: i.base_factor,
        lossRatio: i.loss_ratio,
        groupId: i.group ? groupId[i.group] : null,
      },
    });
  }

  // 3) Liên kết nguồn BTP (sống → chín/nướng...)
  const idByName = Object.fromEntries((await prisma.ingredient.findMany({ select: { id: true, name: true } })).map((x) => [x.name, x.id]));
  let linked = 0;
  for (const i of data.ingredients) {
    if (!i.source) continue;
    const srcId = idByName[i.source];
    const myId = idByName[i.name];
    if (srcId && myId) {
      await prisma.ingredient.update({ where: { id: myId }, data: { sourceIngredientId: srcId } });
      linked++;
    }
  }

  console.log(`✅ Seed Mâm Vị: ${data.groups.length} nhóm, ${data.ingredients.length} nguyên liệu, ${linked} BTP liên kết nguồn`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
