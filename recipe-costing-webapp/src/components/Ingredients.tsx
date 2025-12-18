import React from 'react'
import type { Ingredient, Unit } from '../types'
import { uid } from '../lib/ids'
import { ingredientUnitCost } from '../lib/calc'
import { money, num, unitLabel } from '../lib/format'
import { Modal } from './Modal'

const units: Unit[] = ['g', 'ml', 'pc']

function parseNum(v: string) {
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function IngredientsTab(props: {
  ingredients: Ingredient[]
  setIngredients: (next: Ingredient[]) => void
}) {
  const [query, setQuery] = React.useState('')
  const [editing, setEditing] = React.useState<Ingredient | null>(null)
  const [creating, setCreating] = React.useState(false)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return props.ingredients
    return props.ingredients.filter(i => i.name.toLowerCase().includes(q) || (i.supplier ?? '').toLowerCase().includes(q))
  }, [query, props.ingredients])

  const sorted = React.useMemo(() => [...filtered].sort((a, b) => a.name.localeCompare(b.name)), [filtered])

  const upsert = (ing: Ingredient) => {
    const existing = props.ingredients.find(x => x.id === ing.id)
    if (existing) props.setIngredients(props.ingredients.map(x => x.id === ing.id ? ing : x))
    else props.setIngredients([...props.ingredients, ing])
  }

  return (
    <div className="panel">
      <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
        <h2>Υλικά</h2>
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Αναζήτηση υλικού ή προμηθευτή" />
          <button className="btn primary" onClick={() => setCreating(true)}>Νέο υλικό</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Όνομα</th>
            <th>Προμηθευτής</th>
            <th>Μονάδα</th>
            <th>Ποσότητα συσκ.</th>
            <th>Κόστος συσκ.</th>
            <th>Κόστος μονάδας</th>
            <th className="noPrint">Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(i => {
            const uc = ingredientUnitCost(i)
            return (
              <tr key={i.id}>
                <td><b>{i.name}</b></td>
                <td className="muted">{i.supplier ?? ''}</td>
                <td><span className="pill">{unitLabel(i.unit)}</span></td>
                <td>{num(i.packSize)} {unitLabel(i.unit)}</td>
                <td>{money(i.packCost)}</td>
                <td>{Number.isFinite(uc) ? `${money(uc)} ανά ${unitLabel(i.unit)}` : 'Άγνωστο'}</td>
                <td className="noPrint">
                  <div className="row">
                    <button className="btn" onClick={() => setEditing(i)}>Επεξεργασία</button>
                    <button className="btn danger" onClick={() => {
                      const ok = confirm(`Διαγραφή του υλικού "${i.name}";`)
                      if (!ok) return
                      props.setIngredients(props.ingredients.filter(x => x.id !== i.id))
                    }}>Διαγραφή</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 ? (
            <tr><td colSpan={7} className="muted">Δεν υπάρχουν υλικά. Πρόσθεσε τα βασικά πρώτα (π.χ. γάλα, αλεύρι).</td></tr>
          ) : null}
        </tbody>
      </table>

      {(creating || editing) ? (
        <IngredientModal
          title={editing ? 'Επεξεργασία υλικού' : 'Νέο υλικό'}
          initial={editing ?? null}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSave={(ing) => {
            upsert(ing)
            setCreating(false)
            setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function IngredientModal(props: {
  title: string
  initial: Ingredient | null
  onClose: () => void
  onSave: (ing: Ingredient) => void
}) {
  const [name, setName] = React.useState(props.initial?.name ?? '')
  const [supplier, setSupplier] = React.useState(props.initial?.supplier ?? '')
  const [unit, setUnit] = React.useState<Unit>(props.initial?.unit ?? 'g')
  const [packSize, setPackSize] = React.useState(String(props.initial?.packSize ?? 1000))
  const [packCost, setPackCost] = React.useState(String(props.initial?.packCost ?? 0))
  const [notes, setNotes] = React.useState(props.initial?.notes ?? '')

  const validate = () => {
    if (!name.trim()) return 'Χρειάζεται όνομα'
    const ps = parseNum(packSize)
    const pc = parseNum(packCost)
    if (ps <= 0) return 'Η ποσότητα συσκευασίας πρέπει να είναι πάνω από 0'
    if (pc < 0) return 'Το κόστος συσκευασίας πρέπει να είναι 0 ή μεγαλύτερο'
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
              const id = props.initial?.id ?? uid('ing')
              props.onSave({
                id,
                name: name.trim(),
                supplier: supplier.trim() || undefined,
                unit,
                packSize: parseNum(packSize),
                packCost: parseNum(packCost),
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
            <div className="muted">Όνομα υλικού</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="π.χ. Γάλα" />
          </label>

          <label>
            <div className="muted">Προμηθευτής</div>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Προαιρετικό" />
          </label>

          <label>
            <div className="muted">Μονάδα μέτρησης</div>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {units.map(u => <option key={u} value={u}>{unitLabel(u)} ({u})</option>)}
            </select>
          </label>

          <div className="row">
            <label>
              <div className="muted">Ποσότητα συσκευασίας</div>
              <input value={packSize} onChange={(e) => setPackSize(e.target.value)} />
            </label>

            <label>
              <div className="muted">Κόστος συσκευασίας (€)</div>
              <input value={packCost} onChange={(e) => setPackCost(e.target.value)} />
            </label>
          </div>

          <label>
            <div className="muted">Σημειώσεις</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Προαιρετικές σημειώσεις" />
          </label>
        </div>

        <div className="muted">
          Το κόστος μονάδας προκύπτει από: κόστος συσκευασίας / ποσότητα συσκευασίας.
          Κράτα την ίδια μονάδα (γρ, ml, τεμ) για να γίνονται σωστά οι υπολογισμοί.
        </div>
      </div>
    </Modal>
  )
}
