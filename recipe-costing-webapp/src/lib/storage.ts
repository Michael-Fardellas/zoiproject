import type { AppData } from '../types'

const KEY = 'recipeCosting:data:v1'
const nowIso = () => new Date().toISOString()

const defaultData: AppData = {
  ingredients: [],
  recipes: [],
  menuItems: [],
  schemaVersion: 1,
  exportedAt: nowIso(),
}

export function loadAll(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData
    const parsed = JSON.parse(raw) as AppData
    if (!parsed || parsed.schemaVersion !== 1) return defaultData
    return {
      ...defaultData,
      ...parsed,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
      menuItems: Array.isArray(parsed.menuItems) ? parsed.menuItems : [],
    }
  } catch {
    return defaultData
  }
}

export function saveAll(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify({ ...data, schemaVersion: 1 }))
}

export function exportJson(data: AppData): string {
  const payload: AppData = { ...data, schemaVersion: 1, exportedAt: nowIso() }
  return JSON.stringify(payload, null, 2)
}

export function importJson(text: string): AppData {
  const parsed = JSON.parse(text) as AppData
  if (!parsed || parsed.schemaVersion !== 1) throw new Error('Unsupported file format')
  return {
    ingredients: parsed.ingredients ?? [],
    recipes: parsed.recipes ?? [],
    menuItems: parsed.menuItems ?? [],
    schemaVersion: 1,
    exportedAt: parsed.exportedAt ?? nowIso(),
  }
}
