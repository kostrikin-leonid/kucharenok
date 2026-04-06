-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "isPreparation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN "preparationRecipeId" TEXT;

-- CreateIndex
CREATE INDEX "Recipe_isPreparation_idx" ON "Recipe"("isPreparation");

-- CreateIndex
CREATE INDEX "RecipeIngredient_preparationRecipeId_idx" ON "RecipeIngredient"("preparationRecipeId");

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_preparationRecipeId_fkey" FOREIGN KEY ("preparationRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
