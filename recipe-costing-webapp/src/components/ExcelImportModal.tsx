import React from 'react'
import type { IngredientLine } from '../types'
import { Modal } from './Modal'
import { uid } from '../lib/ids'
import { money, num } from '../lib/format'

type XLSXModule = {
  read: (data: ArrayBuffer, opts: { type: 'array' }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
  utils: {
    sheet_to_json: <T = any>(sheet: unknown, opts: { defval: any }) => T[]
  }
}

type Preview = {
  dishName?: string
  sellingPrice?: number
  lines: IngredientLine[]
  warnings: string[]
  sourceLabel: string
}

type Workbook = ReturnType<XLSXModule['read']>

async function loadXlsx(): Promise<XLSXModule> {
  const cached = (window as any).__xlsxCache as XLSXModule | undefined
  if (cached) return cached
  const mod = await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs')
  ;(window as any).__xlsxCache = mod
  return mod as XLSXModule
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function parseWorkbook(workbook: Workbook, sourceLabel: string, XLSX: XLSXModule): Preview {
  if (!workbook.SheetNames.length) throw new Error('Δεν βρέθηκε φύλλο στο αρχείο.')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const warnings: string[] = []
  const lines: IngredientLine[] = []

  let dishName: string | undefined
  let sellingPrice: number | undefined

  rows.forEach((row, idx) => {
    if (!dishName) dishName = String(row['Πιάτο'] ?? row['Dish'] ?? '').trim() || undefined
    if (sellingPrice === undefined) {
      const price = parseNumber(row['Τιμή Πώλησης'] ?? row['Price'] ?? row['Selling Price'])
      if (price > 0) sellingPrice = price
    }

    const name = String(row['Όνομα'] ?? row['Υλικό'] ?? row['Name'] ?? '').trim()
    if (!name) {
      warnings.push(`Γραμμή ${idx + 2}: λείπει όνομα υλικού`)
      return
    }

    const grams = parseNumber(row['Γραμμάρια'] ?? row['Γρ'] ?? row['Grams'] ?? row['Qty'] ?? row['Quantity'])
    const cost = parseNumber(row['Κόστος'] ?? row['Κόστος (€)'] ?? row['Cost'] ?? row['€'])

    if (grams <= 0) warnings.push(`Γραμμή ${idx + 2}: γραμμάρια άγνωστα, καταγράφηκαν ως 0`)
    if (cost < 0) warnings.push(`Γραμμή ${idx + 2}: αρνητικό κόστος, καταγράφηκε ως 0`)

    lines.push({
      id: uid('ing'),
      name,
      grams: grams > 0 ? grams : 0,
      cost: cost >= 0 ? cost : 0,
    })
  })

  if (!lines.length) throw new Error('Δεν βρέθηκαν υλικά στο φύλλο.')

  return { dishName, sellingPrice, lines, warnings, sourceLabel }
}

export function ExcelImportModal(props: {
  existingCount: number
  onApply: (dishName: string | undefined, sellingPrice: number | undefined, lines: IngredientLine[]) => void
  onClose: () => void
}) {
  const [preview, setPreview] = React.useState<Preview | null>(null)
  const [url, setUrl] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement | null>(null)

  const applyWorkbook = async (buffer: ArrayBuffer, label: string) => {
    setLoading(true)
    try {
      const XLSX = await loadXlsx()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const parsed = parseWorkbook(workbook, label, XLSX)
      setPreview(parsed)
      setError(null)
    } catch (err) {
      const msg = (err as Error).message || 'Άγνωστο σφάλμα'
      setError(`Δεν μπορέσαμε να διαβάσουμε το Excel. ${msg}`)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    const buffer = await file.arrayBuffer()
    await applyWorkbook(buffer, file.name)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUrl = async () => {
    if (!url.trim()) {
      setError('Γράψε έναν σύνδεσμο πρώτα.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(url.trim())
      if (!response.ok) throw new Error('Δεν μπόρεσα να κατεβάσω το αρχείο από τον σύνδεσμο.')
      const buffer = await response.arrayBuffer()
      await applyWorkbook(buffer, url.trim())
    } catch (err) {
      const msg = (err as Error).message || 'Άγνωστο σφάλμα'
      setError(`Δεν ολοκληρώθηκε η φόρτωση. ${msg}`)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const actionButtons = (
    <>
      <button className="btn" onClick={props.onClose}>Κλείσιμο</button>
      <button
        className="btn primary"
        disabled={!preview || loading}
        onClick={() => preview && props.onApply(preview.dishName, preview.sellingPrice, preview.lines)}
      >
        Φόρτωση στο πιάτο
      </button>
    </>
  )

  return (
    <Modal title="Εισαγωγή από Excel ή σύνδεσμο" onClose={props.onClose} actions={actionButtons}>
      <div className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="muted">
            Άνοιξε ένα αρχείο Excel (.xlsx) ή επικόλλησε έναν ασφαλή σύνδεσμο (όπως το παρεχόμενο SharePoint). Χρειάζεται σύνδεση στο διαδίκτυο για να διαβαστεί το αρχείο Excel.
            Χρησιμοποιούμε το πρώτο φύλλο με στήλες: Πιάτο (προαιρετικό), Όνομα/Υλικό, Γραμμάρια, Κόστος (€), Τιμή Πώλησης (προαιρετικό).
          </div>

          <div className="row">
            <button className="btn" onClick={() => fileRef.current?.click()}>Άνοιγμα αρχείου Excel</button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {loading ? <span className="muted">Γίνεται ανάγνωση...</span> : null}
          </div>

          <label>
            <div className="muted">Ή επικόλλησε σύνδεσμο (π.χ. SharePoint, OneDrive)</div>
            <div className="row">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://...xlsx"
                style={{ minWidth: 260 }}
              />
              <button className="btn" onClick={handleUrl} disabled={loading}>Φόρτωση συνδέσμου</button>
            </div>
          </label>

          {error ? <div className="errorBox">{error}</div> : null}
          {preview ? (
            <div className="okBox">
              Βρέθηκαν {preview.lines.length} υλικά από το {preview.sourceLabel}.
              Μπορείς να ελέγξεις τα πρώτα 10 παρακάτω πριν την εισαγωγή.
            </div>
          ) : (
            <div className="muted">Περίμενε επιβεβαίωση πριν κάνεις εισαγωγή. Τα δεδομένα αποθηκεύονται μόνο στη συσκευή σου.</div>
          )}

          {preview && preview.warnings.length ? (
            <div className="errorBox" style={{ maxHeight: 120, overflow: 'auto' }}>
              {preview.warnings.map((w, idx) => <div key={idx}>{w}</div>)}
            </div>
          ) : null}
        </div>

        <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Γρήγορη προεπισκόπηση</h3>
            <span className="muted">Δείχνουμε έως 10 γραμμές</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Πιάτο</th>
                <th>Υλικό</th>
                <th>Γρ</th>
                <th>Κόστος (€)</th>
                <th>Τιμή πώλησης</th>
              </tr>
            </thead>
            <tbody>
              {(preview?.lines.slice(0, 10) ?? []).map((ing, idx) => (
                <tr key={ing.id + idx}>
                  <td className="muted">{preview.dishName ?? '-'}</td>
                  <td><b>{ing.name}</b></td>
                  <td>{num(ing.grams)} γρ</td>
                  <td>{money(ing.cost)}</td>
                  <td>{preview.sellingPrice ? `${money(preview.sellingPrice)} €` : '-'}</td>
                </tr>
              ))}
              {!(preview?.lines.length) ? (
                <tr><td colSpan={5} className="muted">Πρόσθεσε αρχείο για να δεις προεπισκόπηση.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
