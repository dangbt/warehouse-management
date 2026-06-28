import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ImportOrdersModule } from './modules/import-orders/import-orders.module';
import { StockExportsModule } from './modules/stock-exports/stock-exports.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { UsersModule } from './modules/users/users.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuditInterceptor } from './modules/audit-logs/audit.interceptor';
import { CommonModule } from './modules/common/common.module';
import { ReportsModule } from './modules/reports/reports.module';
import { KiotVietModule } from './modules/kiotviet/kiotviet.module';
import { BatchesModule } from './modules/batches/batches.module';
import { StocktakeModule } from './modules/stocktake/stocktake.module';
import { PurchaseReturnsModule } from './modules/purchase-returns/purchase-returns.module';
import { SupplierPaymentsModule } from './modules/supplier-payments/supplier-payments.module';
import { IngredientGroupsModule } from './modules/ingredient-groups/ingredient-groups.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { MenuModule } from './modules/menu/menu.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    IngredientsModule,
    SuppliersModule,
    ImportOrdersModule,
    StockExportsModule,
    RecipesModule,
    UsersModule,
    AuditLogsModule,
    CommonModule,
    ReportsModule,
    KiotVietModule,
    BatchesModule,
    StocktakeModule,
    PurchaseReturnsModule,
    SupplierPaymentsModule,
    IngredientGroupsModule,
    ProcessingModule,
    MenuModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  controllers: [HealthController],
})
export class AppModule {}
