import React from 'react'
import type { AppData, Ingredient, MenuItem } from '../types'
import { ExcelImportModal } from './ExcelImportModal'
import { uid } from '../lib/ids'

export function FileButtons(props: {
  data: AppData
  onImport: (data: AppData) => void
  onReset: () => void
}) {
  const [excelOpen, setExcelOpen] = React.useState(false)

  const downloadTemplate = () => {
    const csv = [
      ['Πιάτο', 'Υλικό', 'Ποσότητα', 'Μονάδα', 'Κόστος/μονάδα', 'Τιμή πώλησης', 'Μερίδες'].join(','),
      ['Παράδειγμα Σαλάτας', 'Ντομάτα', '120', 'g', '0.004', '7.5', '1'].join(','),
      ['Παράδειγμα Σαλάτας', 'Ελαιόλαδο', '12', 'ml', '0.01', '', ''].join(','),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'piata_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const mergeIngredients = (existing: Ingredient[], incoming: Ingredient[]) => {
    const byName = new Map(existing.map(i => [i.name.toLowerCase(), i]))
    const merged: Ingredient[] = [...existing]
    const idMap = new Map<string, string>()

    incoming.forEach((ing) => {
      const key = ing.name.toLowerCase()
      const found = byName.get(key)
      if (found) {
        const updated: Ingredient = {
          ...found,
          unit: ing.unit || found.unit,
          packSize: ing.packSize > 0 ? ing.packSize : found.packSize,
          packCost: ing.packCost >= 0 ? ing.packCost : found.packCost,
          updatedAt: new Date().toISOString(),
        }
        const idx = merged.findIndex(i => i.id === found.id)
        merged[idx] = updated
        byName.set(key, updated)
        idMap.set(ing.id, updated.id)
      } else {
        const next: Ingredient = { ...ing, id: uid('ing'), updatedAt: new Date().toISOString() }
        merged.push(next)
        byName.set(key, next)
        idMap.set(ing.id, next.id)
      }
    })

    return { ingredients: merged, idMap }
  }

  const mergeMenuItems = (existing: MenuItem[], incoming: MenuItem[], menuMode: 'append' | 'replace') => {
    const base = menuMode === 'append' ? [...existing] : []
    const byName = new Map(base.map(m => [m.name.toLowerCase(), m]))
    const result = [...base]

    incoming.forEach(m => {
      const key = m.name.toLowerCase()
      const normalized: MenuItem = { ...m, updatedAt: new Date().toISOString() }
      const found = byName.get(key)
      if (found) {
        const idx = result.findIndex(x => x.id === found.id)
        result[idx] = { ...normalized, id: found.id }
      } else {
        result.push({ ...normalized, id: uid('menu') })
      }
      byName.set(key, normalized)
    })

    return result
  }

  return (
    <div className="row">
      <button className="btn primary" onClick={() => setExcelOpen(true)}>
        Εισαγωγή Excel / Συνδέσμου
      </button>

      <button className="btn" onClick={downloadTemplate}>
        Κατέβασε πρότυπο Excel/CSV
      </button>

      <button
        className="btn danger"
        onClick={() => {
          const ok = confirm('Θα διαγραφούν όλα τα δεδομένα από αυτή τη συσκευή. Συνέχεια;')
          if (ok) props.onReset()
        }}
      >
        Μηδενισμός δεδομένων
      </button>

      <button className="btn" onClick={() => window.print()}>
        Εκτύπωση ή αποθήκευση PDF
      </button>

      {excelOpen ? (
        <ExcelImportModal
          existingIngredients={props.data.ingredients.length}
          existingDishes={props.data.menuItems.length}
          onApply={(result) => {
            if (result.kind === 'ingredients') {
              const nextIngredients = result.mode === 'replace' ? result.ingredients : mergeIngredients(props.data.ingredients, result.ingredients).ingredients
              props.onImport({ ...props.data, ingredients: nextIngredients, exportedAt: new Date().toISOString() })
            } else {
              const baseIngredients = result.menuMode === 'replace' ? [] : props.data.ingredients
              const mergedIngs = mergeIngredients(baseIngredients, result.ingredients)
              const remappedMenuItems = result.menuItems.map(m => ({
                ...m,
                lines: m.lines.map(l => ({
                  ...l,
                  ref: { kind: 'ingredient', ingredientId: mergedIngs.idMap.get(l.ref.ingredientId) ?? l.ref.ingredientId },
                })),
              }))
              const nextMenuItems = mergeMenuItems(props.data.menuItems, remappedMenuItems, result.menuMode)
              props.onImport({
                ...props.data,
                ingredients: mergedIngs.ingredients,
                menuItems: nextMenuItems,
                exportedAt: new Date().toISOString(),
              })
            }
            setExcelOpen(false)
          }}
          onClose={() => setExcelOpen(false)}
        />
      ) : null}
    </div>
  )
}
