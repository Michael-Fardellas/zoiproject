import React from 'react'
import type { Ingredient, Unit } from '../types'
import { uid } from '../lib/ids'
import { ingredientUnitCost } from '../lib/calc'
import { money, num } from '../lib/format'
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
        <h2>Ingredients</h2>
        <div className="row">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search ingredient or supplier" />
          <button className="btn primary" onClick={() => setCreating(true)}>Add ingredient</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Supplier</th>
            <th>Unit</th>
            <th>Pack size</th>
            <th>Pack cost</th>
            <th>Unit cost</th>
            <th className="noPrint">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(i => {
            const uc = ingredientUnitCost(i)
            return (
              <tr key={i.id}>
                <td><b>{i.name}</b></td>
                <td className="muted">{i.supplier ?? ''}</td>
                <td><span className="pill">{i.unit}</span></td>
                <td>{num(i.packSize)} {i.unit}</td>
                <td>{money(i.packCost)}</td>
                <td>{Number.isFinite(uc) ? `${money(uc)} per ${i.unit}` : 'N/A'}</td>
                <td className="noPrint">
                  <div className="row">
                    <button className="btn" onClick={() => setEditing(i)}>Edit</button>
                    <button className="btn danger" onClick={() => {
                      const ok = confirm(`Delete ingredient "${i.name}"?`)
                      if (!ok) return
                      props.setIngredients(props.ingredients.filter(x => x.id !== i.id))
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 ? (
            <tr><td colSpan={7} className="muted">No ingredients.</td></tr>
          ) : null}
        </tbody>
      </table>

      {(creating || editing) ? (
        <IngredientModal
          title={editing ? 'Edit ingredient' : 'Add ingredient'}
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
    if (!name.trim()) return 'Name is required'
    const ps = parseNum(packSize)
    const pc = parseNum(packCost)
    if (ps <= 0) return 'Pack size must be > 0'
    if (pc < 0) return 'Pack cost must be >= 0'
    return null
  }

  const err = validate()

  return (
    <Modal
      title={props.title}
      onClose={props.onClose}
      actions={
        <>
          <button className="btn" onClick={props.onClose}>Cancel</button>
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
            Save
          </button>
        </>
      }
    >
      {err ? <div className="errorBox">{err}</div> : <div className="okBox">OK</div>}
      <div className="hr" />
      <div className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <label>
            <div className="muted">Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="eg Milk" />
          </label>

          <label>
            <div className="muted">Supplier</div>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Optional" />
          </label>

          <label>
            <div className="muted">Unit</div>
            <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>

          <div className="row">
            <label>
              <div className="muted">Pack size</div>
              <input value={packSize} onChange={(e) => setPackSize(e.target.value)} />
            </label>

            <label>
              <div className="muted">Pack cost</div>
              <input value={packCost} onChange={(e) => setPackCost(e.target.value)} />
            </label>
          </div>

          <label>
            <div className="muted">Notes</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </label>
        </div>

        <div className="muted">
          Unit cost is computed as packCost / packSize.
          Units must match exactly. No conversions between g and ml.
        </div>
      </div>
    </Modal>
  )
}
