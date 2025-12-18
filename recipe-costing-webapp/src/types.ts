export type IngredientLine = {
  id: string
  name: string
  grams: number
  cost: number
  notes?: string
}

export type Dish = {
  name: string
  sellingPrice?: number
  lines: IngredientLine[]
  updatedAt: string
}

export type AppData = {
  dish: Dish
  schemaVersion: number
  exportedAt: string
}
