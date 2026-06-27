import { Module } from '@nestjs/common';
import { IngredientGroupsController } from './ingredient-groups.controller';
import { IngredientGroupsService } from './ingredient-groups.service';

@Module({
  controllers: [IngredientGroupsController],
  providers: [IngredientGroupsService],
})
export class IngredientGroupsModule {}
