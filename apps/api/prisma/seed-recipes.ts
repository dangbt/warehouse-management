/**
 * Seed công thức từ file FOODCOST VÀ MENU NHÀ HÀNG MÂM VỊ.
 * Chạy: npx tsx prisma/seed-recipes.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SeedData {
  ingredients: { name: string; unit: string; costPerUnit: number }[];
  recipes: { name: string; category: string; ingredients: { name: string; quantity: number; unit: string }[] }[];
}

async function main() {
  const data: SeedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-recipes.json'), 'utf8'));

  // 1) Upsert ingredients in batches
  let ingCount = 0;
  for (let i = 0; i < data.ingredients.length; i += 50) {
    const batch = data.ingredients.slice(i, i + 50);
    await prisma.$transaction(
      batch.map((ing) =>
        prisma.ingredient.upsert({
          where: { name: ing.name },
          update: { costPerUnit: ing.costPerUnit },
          create: { name: ing.name, unit: ing.unit, category: 'Nguyên liệu', currentStock: 0, minStock: 0, costPerUnit: ing.costPerUnit },
        }),
      ),
    );
    ingCount += batch.length;
    process.stdout.write(`\r  NL: ${ingCount}/${data.ingredients.length}`);
  }
  console.log(`\n✅ ${ingCount} nguyên liệu`);

  // Build name→id map
  const ingMap = Object.fromEntries(
    (await prisma.ingredient.findMany({ select: { id: true, name: true } })).map((x) => [x.name, x.id]),
  );

  // 2) Pre-load existing menu items & recipes
  const existingMenuItems = await prisma.menuItem.findMany({ select: { id: true, name: true } });
  const menuMap = new Map(existingMenuItems.map((m) => [m.name, m.id]));
  const existingRecipes = await prisma.recipe.findMany({ select: { id: true, menuItemId: true } });
  const recipeMap = new Map(existingRecipes.map((r) => [r.menuItemId, r.id]));

  // Seed recipes
  let created = 0;
  for (let i = 0; i < data.recipes.length; i++) {
    const recipe = data.recipes[i];
    let menuItemId = menuMap.get(recipe.name);
    if (!menuItemId) {
      const mi = await prisma.menuItem.create({
        data: { name: recipe.name, price: 0, category: recipe.category, inventoryMode: 'RECIPE' },
      });
      menuItemId = mi.id;
      menuMap.set(recipe.name, mi.id);
    }

    let recipeId = recipeMap.get(menuItemId);
    if (!recipeId) {
      const r = await prisma.recipe.create({ data: { name: recipe.name, menuItemId, servingSize: 1 } });
      recipeId = r.id;
      recipeMap.set(menuItemId, r.id);
    } else {
      // Already seeded, skip
      if ((i + 1) % 10 === 0) process.stdout.write(`\r  CT: ${i + 1}/${data.recipes.length}`);
      continue;
    }

    const valid = recipe.ingredients.filter((ri) => ingMap[ri.name]);
    if (valid.length > 0) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId } });
      await prisma.recipeIngredient.createMany({
        data: valid.map((ri) => ({ recipeId: recipeId!, ingredientId: ingMap[ri.name], quantity: ri.quantity, unit: ri.unit })),
      });
      created++;
    }
    if ((i + 1) % 10 === 0) process.stdout.write(`\r  CT: ${i + 1}/${data.recipes.length}`);
  }
  console.log(`\n✅ ${created} công thức seeded`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
