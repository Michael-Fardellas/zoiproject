import React from 'react'
import type { AppData, Dish, IngredientLine } from './types'
import { loadAll, saveAll } from './lib/storage'
import { uid } from './lib/ids'
import { money, num } from './lib/format'
import { ExcelImportModal } from './components/ExcelImportModal'

type Totals = {
  totalGrams: number
  totalCost: number
  costPerGram: number
  margin: number
  marginPct: number
}

function computeTotals(dish: Dish): Totals {
  const totalGrams = dish.lines.reduce((s, l) => s + (Number.isFinite(l.grams) ? l.grams : 0), 0)
  const totalCost = dish.lines.reduce((s, l) => s + (Number.isFinite(l.cost) ? l.cost : 0), 0)
  const costPerGram = totalGrams > 0 ? totalCost / totalGrams : 0
  const price = dish.sellingPrice ?? 0
  const margin = price - totalCost
  const marginPct = price > 0 ? (margin / price) : 0
  return { totalGrams, totalCost, costPerGram, margin, marginPct }
}

const parseInputNumber = (value: string) => {
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function App() {
  const [data, setData] = React.useState<AppData>(() => loadAll())
  const [excelOpen, setExcelOpen] = React.useState(false)

  React.useEffect(() => { saveAll(data) }, [data])

  const totals = computeTotals(data.dish)

  const updateDish = (patch: Partial<Dish>) => {
    setData({ ...data, dish: { ...data.dish, ...patch, updatedAt: new Date().toISOString() } })
  }

  const upsertLine = (line: IngredientLine) => {
    const existing = data.dish.lines.find(l => l.id === line.id)
    const nextLines = existing
      ? data.dish.lines.map(l => l.id === line.id ? line : l)
      : [...data.dish.lines, line]
    updateDish({ lines: nextLines })
  }

  const removeLine = (id: string) => updateDish({ lines: data.dish.lines.filter(l => l.id !== id) })

  const resetDish = () => {
    updateDish({ name: 'Νέο πιάτο', sellingPrice: undefined, lines: [] })
  }

  return (
    <div className="app">
      <div className="topbar noPrint">
        <div className="brand">
          <h1>ΠΡΟΓΡΑΜΜΑ ΓΙΑ ΣΥΝΤΑΓΕΣ ΖΩΗ</h1>
          <small>Φιλικό για όλους: δώσε ένα πιάτο, βάλε υλικά (γράμματα & κόστος) ή φόρτωσε το Excel σου.</small>
        </div>

        <div className="row">
          <button className="btn primary" onClick={() => setExcelOpen(true)}>Εισαγωγή από Excel</button>
          <button className="btn" onClick={() => window.print()}>Εξαγωγή σε PDF</button>
          <button className="btn danger" onClick={resetDish}>Καθαρισμός πιάτου</button>
        </div>
      </div>

      <div className="infoStrip noPrint">
        1) Γράψε όνομα πιάτου & τιμή (προαιρετικά). 2) Πρόσθεσε υλικά με γραμμάρια και κόστος. 3) Δες το άθροισμα και εκτύπωσε PDF.
      </div>

      <div className="panel">
        <div className="split">
          <div style={{ display: 'grid', gap: 12 }}>
            <label>
              <div className="muted">Όνομα πιάτου</div>
              <input
                value={data.dish.name}
                onChange={(e) => updateDish({ name: e.target.value })}
                placeholder="π.χ. Κοτόπουλο με ρύζι"
              />
            </label>

            <label>
              <div className="muted">Τιμή πώλησης (προαιρετική)</div>
              <input
                value={data.dish.sellingPrice ?? ''}
                onChange={(e) => {
                  const val = parseInputNumber(e.target.value)
                  updateDish({ sellingPrice: e.target.value.trim() === '' ? undefined : val })
                }}
                placeholder="€"
              />
            </label>
          </div>

          <div className="summaryBox">
            <div className="summaryRow">
              <span>Συνολικά γραμμάρια</span>
              <b>{num(totals.totalGrams)} γρ</b>
            </div>
            <div className="summaryRow">
              <span>Συνολικό κόστος</span>
              <b>{money(totals.totalCost)} €</b>
            </div>
            <div className="summaryRow">
              <span>Κόστος ανά γρ</span>
              <b>{money(totals.costPerGram)} €</b>
            </div>
            <div className="summaryRow">
              <span>Κόστος ανά πιάτο</span>
              <b>{money(totals.totalCost)} €</b>
            </div>
            <div className="summaryRow">
              <span>Κέρδος / Περιθώριο</span>
              <b>{money(totals.margin)} € ({(totals.marginPct * 100).toFixed(1)}%)</b>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row noPrint" style={{ justifyContent: 'space-between' }}>
          <h2>Υλικά του πιάτου</h2>
          <button className="btn primary" onClick={() => upsertLine({ id: uid('ing'), name: '', grams: 0, cost: 0 })}>Προσθήκη υλικού</button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Όνομα υλικού</th>
              <th>Γραμμάρια</th>
              <th>Κόστος (€)</th>
              <th>Κόστος/γρ</th>
              <th className="noPrint">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {data.dish.lines.map(line => {
              const costPerGram = line.grams > 0 ? line.cost / line.grams : 0
              return (
                <tr key={line.id}>
                  <td>
                    <input
                      value={line.name}
                      onChange={(e) => upsertLine({ ...line, name: e.target.value })}
                      placeholder="π.χ. Ρύζι basmati"
                    />
                  </td>
                  <td>
                    <input
                      value={line.grams}
                      onChange={(e) => upsertLine({ ...line, grams: parseInputNumber(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      value={line.cost}
                      onChange={(e) => upsertLine({ ...line, cost: parseInputNumber(e.target.value) })}
                    />
                  </td>
                  <td>{money(costPerGram)} €</td>
                  <td className="noPrint">
                    <button className="btn danger" onClick={() => removeLine(line.id)}>Διαγραφή</button>
                  </td>
                </tr>
              )
            })}
            {data.dish.lines.length === 0 ? (
              <tr><td colSpan={5} className="muted">Πρόσθεσε ένα υλικό ή φόρτωσε το Excel.</td></tr>
            ) : null}
          </tbody>
        </table>

        <div className="muted" style={{ marginTop: 10 }}>
          Τα δεδομένα αποθηκεύονται τοπικά. Μπορείς να εκτυπώσεις ή να σώσεις σε PDF όταν είσαι έτοιμος/η.
        </div>
      </div>

      {excelOpen ? (
        <ExcelImportModal
          existingCount={data.dish.lines.length}
          onApply={(dishName, price, lines) => {
            updateDish({ name: dishName || data.dish.name, sellingPrice: price ?? data.dish.sellingPrice, lines })
            setExcelOpen(false)
          }}
          onClose={() => setExcelOpen(false)}
        />
      ) : null}
    </div>
  )
}
