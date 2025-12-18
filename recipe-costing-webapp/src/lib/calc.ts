import type { Ingredient, Recipe, MenuItem, RecipeLine, Unit } from '../types'

export type CostBreakdownRow = {
  label: string
  qty: number
  unit: Unit
  unitCost: number
  lineCost: number
  kind: 'ingredient' | 'recipe'
}

const EPS = 1e-9

export function ingredientUnitCost(ing: Ingredient): number {
  if (ing.packSize <= EPS) return 0
  return ing.packCost / ing.packSize
}

function safeMultiply(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return a * b
}

export function resolveLineUnitCost(
  line: RecipeLine,
  ingredients: Ingredient[],
  recipes: Recipe[],
  memo: Map<string, number>,
  stack: Set<string>,
): { unitCost: number; kind: 'ingredient' | 'recipe'; label: string } {
  if (line.ref.kind === 'ingredient') {
    const ing = ingredients.find(i => i.id === line.ref.ingredientId)
    if (!ing) return { unitCost: 0, kind: 'ingredient', label: 'Missing ingredient' }
    const uc = ingredientUnitCost(ing)
    if (ing.unit !== line.unit) return { unitCost: NaN, kind: 'ingredient', label: `${ing.name} (unit mismatch)` }
    return { unitCost: uc, kind: 'ingredient', label: ing.name }
  }

  const r = recipes.find(x => x.id === line.ref.recipeId)
  if (!r) return { unitCost: 0, kind: 'recipe', label: 'Missing recipe' }
  const uc = recipeUnitCost(r, ingredients, recipes, memo, stack)
  if (r.yieldUnit !== line.unit) return { unitCost: NaN, kind: 'recipe', label: `${r.name} (unit mismatch)` }
  return { unitCost: uc, kind: 'recipe', label: r.name }
}

export function recipeTotalCost(
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  memo = new Map<string, number>(),
  stack = new Set<string>(),
): { totalCost: number; breakdown: CostBreakdownRow[]; errors: string[] } {
  const breakdown: CostBreakdownRow[] = []
  const errors: string[] = []

  for (const line of recipe.lines) {
    const res = resolveLineUnitCost(line, ingredients, recipes, memo, stack)
    if (!Number.isFinite(res.unitCost)) errors.push(`Unit mismatch in ${res.label}`)
    const lineCost = safeMultiply(res.unitCost, line.qty)
    breakdown.push({ label: res.label, qty: line.qty, unit: line.unit, unitCost: res.unitCost, lineCost, kind: res.kind })
  }

  const totalCost = breakdown.reduce((s, r) => s + (Number.isFinite(r.lineCost) ? r.lineCost : 0), 0)
  return { totalCost, breakdown, errors }
}

export function recipeUnitCost(
  recipe: Recipe,
  ingredients: Ingredient[],
  recipes: Recipe[],
  memo = new Map<string, number>(),
  stack = new Set<string>(),
): number {
  if (memo.has(recipe.id)) return memo.get(recipe.id) ?? 0
  if (stack.has(recipe.id)) return 0
  stack.add(recipe.id)

  const { totalCost } = recipeTotalCost(recipe, ingredients, recipes, memo, stack)
  const unitCost = recipe.yieldQty > EPS ? totalCost / recipe.yieldQty : 0
  memo.set(recipe.id, unitCost)

  stack.delete(recipe.id)
  return unitCost
}

export function menuItemCostPerServing(
  item: MenuItem,
  ingredients: Ingredient[],
  recipes: Recipe[],
): { costPerServing: number; totalCost: number; breakdown: CostBreakdownRow[]; errors: string[] } {
  const memo = new Map<string, number>()
  const stack = new Set<string>()
  const breakdown: CostBreakdownRow[] = []
  const errors: string[] = []

  for (const line of item.lines) {
    const res = resolveLineUnitCost(line, ingredients, recipes, memo, stack)
    if (!Number.isFinite(res.unitCost)) errors.push(`Unit mismatch in ${res.label}`)
    const lineCost = safeMultiply(res.unitCost, line.qty)
    breakdown.push({ label: res.label, qty: line.qty, unit: line.unit, unitCost: res.unitCost, lineCost, kind: res.kind })
  }

  const totalCost = breakdown.reduce((s, r) => s + (Number.isFinite(r.lineCost) ? r.lineCost : 0), 0)
  const servings = item.servings > EPS ? item.servings : 1
  return { totalCost, costPerServing: totalCost / servings, breakdown, errors }
}
