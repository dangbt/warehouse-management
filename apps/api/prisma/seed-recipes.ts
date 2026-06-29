/**
 * Seed công thức từ file FOODCOST VÀ MENU NHÀ HÀNG MÂM VỊ.
 * Idempotent: chạy lại sẽ cập nhật theo tên.
 *
 * Chạy: npx tsx prisma/seed-recipes.ts   (từ apps/api)
 *
 * Dữ liệu: prisma/seed-recipes.json (521 NL + 232 công thức)
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SeedIngredient {
  name: string;
  unit: string;
  costPerUnit: number;
}

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface SeedRecipe {
  name: string;
  category: string;
  ingredients: RecipeIngredient[];
}

interface SeedData {
  ingredients: SeedIngredient[];
  recipes: SeedRecipe[];
}

async function main() {
  const data: SeedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-recipes.json'), 'utf8'));

  // 1) Upsert ingredients
  for (const ing of data.ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { costPerUnit: ing.costPerUnit },
      create: { name: ing.name, unit: ing.unit, category: 'Nguyên liệu', currentStock: 0, minStock: 0, costPerUnit: ing.costPerUnit },
    });
  }
  console.log(`✅ ${data.ingredients.length} nguyên liệu upserted`);

  // Build name→id map
  const ingMap = Object.fromEntries(
    (await prisma.ingredient.findMany({ select: { id: true, name: true } })).map((x) => [x.name, x.id]),
  );

  // 2) Upsert menu items + recipes
  let created = 0;
  let skipped = 0;
  for (const recipe of data.recipes) {
    // Upsert MenuItem
    let menuItem = await prisma.menuItem.findFirst({ where: { name: recipe.name } });
    if (!menuItem) {
      menuItem = await prisma.menuItem.create({
        data: { name: recipe.name, price: 0, category: recipe.category, inventoryMode: 'RECIPE' },
      });
    }

    // Upsert Recipe
    let dbRecipe = await prisma.recipe.findUnique({ where: { menuItemId: menuItem.id } });
    if (!dbRecipe) {
      dbRecipe = await prisma.recipe.create({
        data: { name: recipe.name, menuItemId: menuItem.id, servingSize: 1 },
      });
    }

    // Clear old ingredients and re-insert
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: dbRecipe.id } });

    const validIngredients = recipe.ingredients.filter((ri) => ingMap[ri.name]);
    if (validIngredients.length === 0) { skipped++; continue; }

    await prisma.recipeIngredient.createMany({
      data: validIngredients.map((ri) => ({
        recipeId: dbRecipe!.id,
        ingredientId: ingMap[ri.name],
        quantity: ri.quantity,
        unit: ri.unit,
      })),
    });
    created++;
  }

  console.log(`✅ ${created} công thức seeded, ${skipped} bỏ qua (thiếu NL)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
