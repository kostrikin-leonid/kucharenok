-- Weeks that already have a shopping list are treated as "saved" (active).
UPDATE "WeeklyPlan"
SET status = 'active'
WHERE id IN (SELECT "weeklyPlanId" FROM "ShoppingList");
