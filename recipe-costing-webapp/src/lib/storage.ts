import type { AppData, Dish, IngredientLine } from '../types'

const KEY = 'syntagesZois:v2'
const nowIso = () => new Date().toISOString()

const emptyDish: Dish = {
  name: 'Νέο πιάτο',
  sellingPrice: undefined,
  lines: [],
  updatedAt: nowIso(),
}

const defaultData: AppData = {
  dish: emptyDish,
  schemaVersion: 2,
  exportedAt: nowIso(),
}

export function loadAll(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData
    const parsed = JSON.parse(raw) as AppData
    if (!parsed || parsed.schemaVersion !== 2) return defaultData
    return {
      ...defaultData,
      ...parsed,
      dish: {
        ...emptyDish,
        ...(parsed.dish as Dish),
        lines: Array.isArray((parsed.dish as Dish | undefined)?.lines) ? (parsed.dish as Dish).lines as IngredientLine[] : [],
      },
    }
  } catch {
    return defaultData
  }
}

export function saveAll(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify({ ...data, schemaVersion: 2 }))
}
