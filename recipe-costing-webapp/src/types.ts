export type Unit = 'g' | 'ml' | 'pc'

export type Ingredient = {
  id: string
  name: string
  unit: Unit
  packSize: number
  packCost: number
  supplier?: string
  notes?: string
  updatedAt: string
}

export type ComponentRef =
  | { kind: 'ingredient'; ingredientId: string }
  | { kind: 'recipe'; recipeId: string }

export type RecipeLine = {
  id: string
  ref: ComponentRef
  qty: number
  unit: Unit
}

export type Recipe = {
  id: string
  name: string
  category: 'Base' | 'SubRecipe'
  yieldQty: number
  yieldUnit: Unit
  lines: RecipeLine[]
  notes?: string
  updatedAt: string
}

export type MenuItem = {
  id: string
  name: string
  servings: number
  price: number
  lines: RecipeLine[]
  notes?: string
  updatedAt: string
}

export type AppData = {
  ingredients: Ingredient[]
  recipes: Recipe[]
  menuItems: MenuItem[]
  schemaVersion: number
  exportedAt: string
}
