import React from 'react'
import type { Ingredient, Recipe, MenuItem } from '../types'
import { uid } from '../lib/ids'
import { menuItemCostPerServing } from '../lib/calc'
import { money, num, pct, unitLabel } from '../lib/format'
import { Modal } from './Modal'
import { LineEditor } from './LineEditor'

function parseNum(v: string) {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function MenuItemsTab(props: {
  ingredients: Ingredient[]
  recipes: Recipe[]
  menuItems: MenuItem[]
  setMenuItems: (next: MenuItem[]) => void
}) {
  const [query, setQuery] = React.useState('')
  const [editing, setEditing] = React.useState<MenuItem | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [viewing, setViewing] = React.useState<MenuItem | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return props.menuItems
    return props.menuItems.filter(m => m.name.toLowerCase().includes(q))
  }, [query, props.menuItems])

  const sorted = React.useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered])

  const upsert = (m: MenuItem) => {
    const existing = props.menuItems.find(x => x.id === m.id)
    if (existing) props.setMenuItems(props.menuItems.map(x => x.id === m.id ? m : x))
    else props.setMenuItems([...props.menuItems, m])
  }

  return (
    <div className="panel">
      <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0 }}>Πιάτα & άμεσος υπολογισμός κόστους</h2>
          <div className="muted">Πρόσθεσε υλικά χειροκίνητα ή από Excel, όρισε προαιρετικά τιμή πώλησης και εκτύπωσε PDF.</div>
        </div>
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση πιάτου" />
          <button className="btn primary" onClick={() => setCreating(true)}>Νέο πιάτο</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Όνομα</th>
            <th>Μερίδες</th>
            <th>Τιμή</th>
            <th>Κόστος ανά μερίδα</th>
            <th>% Κόστος τροφίμων</th>
            <th className="noPrint">Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(m => {
            const { costPerServing } = menuItemCostPerServing(m, props.ingredients, props.recipes)
            const fc = m.price > 0 ? costPerServing / m.price : 0
            return (
              <tr key={m.id}>
                <td><b>{m.name}</b></td>
                <td>{num(m.servings)}</td>
                <td>{money(m.price)}</td>
                <td>{money(costPerServing)}</td>
                <td>{pct(fc)}%</td>
                <td className="noPrint">
                  <div className="row">
                    <button className="btn" onClick={() => setViewing(m)}>Προβολή</button>
                    <button className="btn" onClick={() => setEditing(m)}>Επεξεργασία</button>
                    <button className="btn danger" onClick={() => {
                      const ok = confirm(`Διαγραφή του πιάτου "${m.name}";`)
                      if (!ok) return
                      props.setMenuItems(props.menuItems.filter(x => x.id !== m.id))
                    }}>Διαγραφή</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 ? <tr><td colSpan={6} className="muted">Δεν υπάρχουν πιάτα. Οργάνωσε πρώτα τα υλικά και τις συνταγές.</td></tr> : null}
        </tbody>
      </table>

      {(creating || editing) ? (
        <MenuItemModal
          title={editing ? 'Επεξεργασία πιάτου' : 'Νέο πιάτο'}
          initial={editing ?? null}
          ingredients={props.ingredients}
          recipes={props.recipes}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={(m) => {
            upsert(m)
            setCreating(false)
            setEditing(null)
          }}
        />
      ) : null}

      {viewing ? <MenuItemViewModal item={viewing} ingredients={props.ingredients} recipes={props.recipes} onClose={() => setViewing(null)} /> : null}
    </div>
  )
}

function MenuItemModal(props: {
  title: string
  initial: MenuItem | null
  ingredients: Ingredient[]
  recipes: Recipe[]
  onClose: () => void
  onSave: (m: MenuItem) => void
}) {
  const [name, setName] = React.useState(props.initial?.name ?? '')
  const [servings, setServings] = React.useState(String(props.initial?.servings ?? 1))
  const [price, setPrice] = React.useState(String(props.initial?.price ?? 0))
  const [notes, setNotes] = React.useState(props.initial?.notes ?? '')
  const [lines, setLines] = React.useState(props.initial?.lines ?? [])

  const validate = () => {
    if (!name.trim()) return 'Χρειάζεται όνομα'
    if (parseNum(servings) <= 0) return 'Οι μερίδες πρέπει να είναι πάνω από 0'
    if (parseNum(price) < 0) return 'Η τιμή πρέπει να είναι 0 ή μεγαλύτερη'
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
              const id = props.initial?.id ?? uid('menu')
              props.onSave({
                id,
                name: name.trim(),
                servings: parseNum(servings),
                price: parseNum(price),
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
            <div className="muted">Όνομα πιάτου</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Κοτόπουλο με ρύζι" />
          </label>

          <div className="row">
            <label>
              <div className="muted">Μερίδες</div>
              <input value={servings} onChange={(e) => setServings(e.target.value)} />
            </label>

            <label>
              <div className="muted">Τιμή (€)</div>
              <input value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>

          <label>
            <div className="muted">Σημειώσεις</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Προαιρετικό" />
          </label>

          <div className="muted">
            Συμβουλή: γράψε τις ποσότητες σε γρ/ml/τεμ ώστε να συμφωνούν με το κόστος των υλικών.
          </div>
        </div>

        <div>
          <LineEditor ingredients={props.ingredients} recipes={props.recipes} lines={lines} setLines={setLines} allowRecipeRefs={false} />
        </div>
      </div>
    </Modal>
  )
}

function MenuItemViewModal(props: {
  item: MenuItem
  ingredients: Ingredient[]
  recipes: Recipe[]
  onClose: () => void
}) {
  const { totalCost, costPerServing, breakdown, errors } = menuItemCostPerServing(props.item, props.ingredients, props.recipes)
  const fc = props.item.price > 0 ? costPerServing / props.item.price : 0
  const totalWeightG = breakdown.filter(b => b.unit === 'g').reduce((s, b) => s + b.qty, 0)

  return (
    <Modal title={`Πιάτο: ${props.item.name}`} onClose={props.onClose}>
      {errors.length ? <div className="errorBox">{errors.join(' | ')}</div> : <div className="okBox">Οι υπολογισμοί έγιναν κανονικά</div>}
      <div className="hr" />
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div><div className="muted">Συνολικό κόστος</div><div><b>{money(totalCost)}</b></div></div>
        <div><div className="muted">Κόστος ανά μερίδα</div><div><b>{money(costPerServing)}</b></div></div>
        <div><div className="muted">Τιμή πώλησης</div><div><b>{money(props.item.price)}</b></div></div>
        <div><div className="muted">Κόστος τροφίμων</div><div><b>{pct(fc)}%</b></div></div>
        <div><div className="muted">Συνολικά γραμμάρια</div><div><b>{num(totalWeightG)} g</b></div></div>
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
          {breakdown.length === 0 ? <tr><td colSpan={4} className="muted">Δεν υπάρχουν γραμμές. Πρόσθεσε υλικά ή συνταγές.</td></tr> : null}
        </tbody>
      </table>
    </Modal>
  )
}
