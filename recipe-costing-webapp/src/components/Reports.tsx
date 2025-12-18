import React from 'react'
import type { Ingredient, Recipe, MenuItem } from '../types'
import { recipeTotalCost, menuItemCostPerServing, ingredientUnitCost } from '../lib/calc'
import { money, num, pct, unitLabel } from '../lib/format'

export function ReportsTab(props: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  menuItems: MenuItem[]
}) {
  const [target, setTarget] = React.useState('0.30')
  const targetFc = (() => {
    const n = Number(target.replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : 0.30
  })()

  return (
    <div className="panel">
      <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
        <h2>Αναφορές</h2>
        <div className="row">
          <span className="muted">Στόχος food cost (π.χ. 0.30)</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} style={{ minWidth: 120 }} />
          <button className="btn" onClick={() => window.print()}>Εκτύπωση ή αποθήκευση PDF</button>
        </div>
      </div>

      <h2>Σύνοψη υλικών</h2>
      <table>
        <thead>
          <tr><th>Όνομα</th><th>Μονάδα</th><th>Κόστος μονάδας</th></tr>
        </thead>
        <tbody>
          {[...props.ingredients].sort((a,b) => a.name.localeCompare(b.name)).map(i => (
            <tr key={i.id}>
              <td><b>{i.name}</b></td>
              <td><span className="pill">{unitLabel(i.unit)}</span></td>
              <td>{money(ingredientUnitCost(i))} ανά {unitLabel(i.unit)}</td>
            </tr>
          ))}
          {props.ingredients.length === 0 ? <tr><td colSpan={3} className="muted">Δεν υπάρχουν υλικά.</td></tr> : null}
        </tbody>
      </table>

      <div className="hr" />

      <h2>Σύνοψη συνταγών</h2>
      <table>
        <thead>
          <tr><th>Όνομα</th><th>Απόδοση</th><th>Συνολικό κόστος</th><th>Κόστος μονάδας</th></tr>
        </thead>
        <tbody>
          {[...props.recipes].sort((a,b) => a.name.localeCompare(b.name)).map(r => {
            const { totalCost } = recipeTotalCost(r, props.ingredients, props.recipes)
            const unitCost = r.yieldQty > 0 ? totalCost / r.yieldQty : 0
            return (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{num(r.yieldQty)} {unitLabel(r.yieldUnit)}</td>
                <td>{money(totalCost)}</td>
                <td>{money(unitCost)} ανά {unitLabel(r.yieldUnit)}</td>
              </tr>
            )
          })}
          {props.recipes.length === 0 ? <tr><td colSpan={4} className="muted">Δεν υπάρχουν συνταγές.</td></tr> : null}
        </tbody>
      </table>

      <div className="hr" />

      <h2>Σύνοψη πιάτων</h2>
      <table>
        <thead>
          <tr><th>Όνομα</th><th>Τιμή</th><th>Κόστος ανά μερίδα</th><th>% Κόστος τροφίμων</th><th>Προτεινόμενη τιμή</th></tr>
        </thead>
        <tbody>
          {[...props.menuItems].sort((a,b) => a.name.localeCompare(b.name)).map(m => {
            const { costPerServing } = menuItemCostPerServing(m, props.ingredients, props.recipes)
            const fc = m.price > 0 ? costPerServing / m.price : 0
            const suggested = targetFc > 0 ? costPerServing / targetFc : 0
            return (
              <tr key={m.id}>
                <td><b>{m.name}</b></td>
                <td>{money(m.price)}</td>
                <td>{money(costPerServing)}</td>
                <td>{pct(fc)}%</td>
                <td>{money(suggested)} (με στόχο {pct(targetFc)}%)</td>
              </tr>
            )
          })}
          {props.menuItems.length === 0 ? <tr><td colSpan={5} className="muted">Δεν υπάρχουν πιάτα.</td></tr> : null}
        </tbody>
      </table>

      <div className="muted" style={{ marginTop: 10 }}>
        Η προτεινόμενη τιμή υπολογίζεται ως: κόστος ανά μερίδα / στόχος food cost.
      </div>
    </div>
  )
}
