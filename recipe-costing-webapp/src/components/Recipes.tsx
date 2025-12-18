import React from 'react'
import type { Ingredient, Recipe, Unit } from '../types'
import { uid } from '../lib/ids'
import { recipeTotalCost } from '../lib/calc'
import { money, num, unitLabel } from '../lib/format'
import { Modal } from './Modal'
import { LineEditor } from './LineEditor'

const units: Unit[] = ['g', 'ml', 'pc']

function parseNum(v: string) {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function RecipesTab(props: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  setRecipes: (next: Recipe[]) => void
}) {
  const [query, setQuery] = React.useState('')
  const [editing, setEditing] = React.useState<Recipe | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [viewing, setViewing] = React.useState<Recipe | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return props.recipes
    return props.recipes.filter(r => r.name.toLowerCase().includes(q))
  }, [query, props.recipes])

  const sorted = React.useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered])

  const upsert = (r: Recipe) => {
    const existing = props.recipes.find(x => x.id === r.id)
    if (existing) props.setRecipes(props.recipes.map(x => x.id === r.id ? r : x))
    else props.setRecipes([...props.recipes, r])
  }

  return (
    <div className="panel">
      <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
        <h2>Συνταγές και υπο-συνταγές</h2>
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση συνταγής" />
          <button className="btn primary" onClick={() => setCreating(true)}>Νέα συνταγή</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Όνομα</th>
            <th>Κατηγορία</th>
            <th>Απόδοση</th>
            <th>Συνολικό κόστος</th>
            <th>Κόστος μονάδας</th>
            <th className="noPrint">Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => {
            const { totalCost } = recipeTotalCost(r, props.ingredients, props.recipes)
            const unitCost = r.yieldQty > 0 ? totalCost / r.yieldQty : 0
            return (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td><span className="pill">{r.category === 'Base' ? 'Βάση' : 'Υπο-συνταγή'}</span></td>
                <td>{num(r.yieldQty)} {unitLabel(r.yieldUnit)}</td>
                <td>{money(totalCost)}</td>
                <td>{money(unitCost)} ανά {unitLabel(r.yieldUnit)}</td>
                <td className="noPrint">
                  <div className="row">
                    <button className="btn" onClick={() => setViewing(r)}>Προβολή</button>
                    <button className="btn" onClick={() => setEditing(r)}>Επεξεργασία</button>
                    <button className="btn danger" onClick={() => {
                      const ok = confirm(`Διαγραφή της συνταγής "${r.name}";`)
                      if (!ok) return
                      props.setRecipes(props.recipes.filter(x => x.id !== r.id))
                    }}>Διαγραφή</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 ? <tr><td colSpan={6} className="muted">Δεν υπάρχουν συνταγές. Ξεκίνα με μία βάση και μετά πρόσθεσε υπο-συνταγές.</td></tr> : null}
        </tbody>
      </table>

      {(creating || editing) ? (
        <RecipeModal
          title={editing ? 'Επεξεργασία συνταγής' : 'Νέα συνταγή'}
          initial={editing ?? null}
          ingredients={props.ingredients}
          recipes={props.recipes}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={(r) => {
            upsert(r)
            setCreating(false)
            setEditing(null)
          }}
        />
      ) : null}

      {viewing ? (
        <RecipeViewModal recipe={viewing} ingredients={props.ingredients} recipes={props.recipes} onClose={() => setViewing(null)} />
      ) : null}
    </div>
  )
}

function RecipeModal(props: {
  title: string
  initial: Recipe | null
  ingredients: Ingredient[]
  recipes: Recipe[]
  onClose: () => void
  onSave: (r: Recipe) => void
}) {
  const [name, setName] = React.useState(props.initial?.name ?? '')
  const [category, setCategory] = React.useState<Recipe['category']>(props.initial?.category ?? 'SubRecipe')
  const [yieldQty, setYieldQty] = React.useState(String(props.initial?.yieldQty ?? 1000))
  const [yieldUnit, setYieldUnit] = React.useState<Unit>(props.initial?.yieldUnit ?? 'g')
  const [notes, setNotes] = React.useState(props.initial?.notes ?? '')
  const [lines, setLines] = React.useState(props.initial?.lines ?? [])

  const validate = () => {
    if (!name.trim()) return 'Χρειάζεται όνομα'
    if (parseNum(yieldQty) <= 0) return 'Η απόδοση πρέπει να είναι πάνω από 0'
    return null
  }
  const err = validate()

  return (
    <Modal
      title={props.title}
      onClose={props.onClose}
      actions={
        <>
          <button className="btn" onClick={props.onClose}>Άκυρο</button>
          <button
            className="btn primary"
            disabled={!!err}
            onClick={() => {
              const id = props.initial?.id ?? uid('rec')
              props.onSave({
                id,
                name: name.trim(),
                category,
                yieldQty: parseNum(yieldQty),
                yieldUnit,
                lines,
                notes: notes.trim() || undefined,
                updatedAt: new Date().toISOString(),
              })
            }}
          >
            Αποθήκευση
          </button>
        </>
      }
    >
      {err ? <div className="errorBox">{err}</div> : <div className="okBox">Έτοιμο για αποθήκευση</div>}
      <div className="hr" />
      <div className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="muted">Όνομα συνταγής</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Μαγιονέζα" />
          </label>

          <label>
            <div className="muted">Κατηγορία</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as Recipe['category'])}>
              <option value="Base">Βάση</option>
              <option value="SubRecipe">Υπο-συνταγή</option>
            </select>
          </label>

          <div className="row">
            <label>
              <div className="muted">Απόδοση συνταγής</div>
              <input value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} />
            </label>

            <label>
              <div className="muted">Μονάδα απόδοσης</div>
              <select value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value as Unit)}>
                {units.map(u => <option key={u} value={u}>{unitLabel(u)} ({u})</option>)}
              </select>
            </label>
          </div>

          <label>
            <div className="muted">Σημειώσεις</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Προαιρετικό" />
          </label>
        </div>

        <div>
          <LineEditor
            ingredients={props.ingredients}
            recipes={props.recipes.filter(r => r.id !== props.initial?.id)}
            lines={lines}
            setLines={setLines}
            allowRecipeRefs={true}
          />
        </div>
      </div>
    </Modal>
  )
}

function RecipeViewModal(props: {
  recipe: Recipe
  ingredients: Ingredient[]
  recipes: Recipe[]
  onClose: () => void
}) {
  const { totalCost, breakdown, errors } = recipeTotalCost(props.recipe, props.ingredients, props.recipes)
  const unitCost = props.recipe.yieldQty > 0 ? totalCost / props.recipe.yieldQty : 0

  return (
    <Modal title={`Συνταγή: ${props.recipe.name}`} onClose={props.onClose}>
      {errors.length ? <div className="errorBox">{errors.join(' | ')}</div> : <div className="okBox">Οι υπολογισμοί έγιναν κανονικά</div>}
      <div className="hr" />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><div className="muted">Απόδοση</div><div><b>{num(props.recipe.yieldQty)} {unitLabel(props.recipe.yieldUnit)}</b></div></div>
        <div><div className="muted">Συνολικό κόστος</div><div><b>{money(totalCost)}</b></div></div>
        <div><div className="muted">Κόστος μονάδας</div><div><b>{money(unitCost)} ανά {unitLabel(props.recipe.yieldUnit)}</b></div></div>
      </div>
      <div className="hr" />
      <table>
        <thead>
          <tr>
            <th>Συστατικό</th>
            <th>Ποσότητα</th>
            <th>Κόστος μονάδας</th>
            <th>Κόστος γραμμής</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((b, idx) => (
            <tr key={idx}>
              <td>{b.label} <span className="pill">{b.kind === 'ingredient' ? 'Υλικό' : 'Συνταγή'}</span></td>
              <td>{num(b.qty)} {unitLabel(b.unit)}</td>
              <td>{Number.isFinite(b.unitCost) ? `${money(b.unitCost)} ανά ${unitLabel(b.unit)}` : 'Άγνωστο'}</td>
              <td>{Number.isFinite(b.lineCost) ? money(b.lineCost) : 'Άγνωστο'}</td>
            </tr>
          ))}
          {breakdown.length === 0 ? <tr><td colSpan={4} className="muted">Δεν υπάρχουν γραμμές. Πρόσθεσε υλικά.</td></tr> : null}
        </tbody>
      </table>
    </Modal>
  )
}
