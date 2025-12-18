import React from 'react'
import type { Ingredient, Recipe, RecipeLine, Unit, ComponentRef } from '../types'
import { uid } from '../lib/ids'

const units: Unit[] = ['g', 'ml', 'pc']

function parseNum(v: string) {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function LineEditor(props: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  lines: RecipeLine[]
  setLines: (next: RecipeLine[]) => void
  allowRecipeRefs: boolean
}) {
  const addLine = () => {
    const ref: ComponentRef =
      props.ingredients.length > 0
        ? { kind: 'ingredient', ingredientId: props.ingredients[0].id }
        : props.allowRecipeRefs && props.recipes.length > 0
          ? { kind: 'recipe', recipeId: props.recipes[0].id }
          : { kind: 'ingredient', ingredientId: 'missing' }

    props.setLines([...props.lines, { id: uid('line'), ref, qty: 0, unit: 'g' }])
  }

  const removeLine = (id: string) => props.setLines(props.lines.filter(l => l.id !== id))

  const updateLine = (id: string, patch: Partial<RecipeLine>) => {
    props.setLines(props.lines.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  const ingredientOptions = props.ingredients.map(i => ({ value: i.id, label: `${i.name} (${i.unit})` }))
  const recipeOptions = props.recipes.map(r => ({ value: r.id, label: `${r.name} (yield ${r.yieldQty}${r.yieldUnit})` }))

  return (
    <div>
      <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
        <h2>Components</h2>
        <button className="btn primary" onClick={addLine}>Add line</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit</th>
            <th className="noPrint">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.lines.map(l => {
            const kind = l.ref.kind
            return (
              <tr key={l.id}>
                <td>
                  <select
                    value={kind}
                    onChange={(e) => {
                      const nextKind = e.target.value as 'ingredient' | 'recipe'
                      if (nextKind === 'recipe' && !props.allowRecipeRefs) return
                      if (nextKind === 'ingredient') {
                        const first = props.ingredients[0]?.id ?? 'missing'
                        updateLine(l.id, { ref: { kind: 'ingredient', ingredientId: first } })
                      } else {
                        const first = props.recipes[0]?.id ?? 'missing'
                        updateLine(l.id, { ref: { kind: 'recipe', recipeId: first } })
                      }
                    }}
                  >
                    <option value="ingredient">Ingredient</option>
                    <option value="recipe" disabled={!props.allowRecipeRefs}>Recipe</option>
                  </select>
                </td>

                <td>
                  {kind === 'ingredient' ? (
                    <select
                      value={l.ref.ingredientId}
                      onChange={(e) => updateLine(l.id, { ref: { kind: 'ingredient', ingredientId: e.target.value } })}
                    >
                      {ingredientOptions.length ? ingredientOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      )) : <option value="missing">No ingredients</option>}
                    </select>
                  ) : (
                    <select
                      value={l.ref.recipeId}
                      onChange={(e) => updateLine(l.id, { ref: { kind: 'recipe', recipeId: e.target.value } })}
                    >
                      {recipeOptions.length ? recipeOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      )) : <option value="missing">No recipes</option>}
                    </select>
                  )}
                </td>

                <td>
                  <input value={String(l.qty)} onChange={(e) => updateLine(l.id, { qty: parseNum(e.target.value) })} />
                </td>

                <td>
                  <select value={l.unit} onChange={(e) => updateLine(l.id, { unit: e.target.value as Unit })}>
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>

                <td className="noPrint">
                  <button className="btn danger" onClick={() => removeLine(l.id)}>Remove</button>
                </td>
              </tr>
            )
          })}
          {props.lines.length === 0 ? <tr><td colSpan={5} className="muted">No lines. Add components.</td></tr> : null}
        </tbody>
      </table>

      <div className="muted" style={{ marginTop: 10 }}>
        Units must match the ingredient unit or recipe yield unit. No automatic conversions.
      </div>
    </div>
  )
}
