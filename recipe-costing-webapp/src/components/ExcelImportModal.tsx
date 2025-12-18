import React from 'react'
import type { Ingredient, Unit } from '../types'
import { Modal } from './Modal'
import { uid } from '../lib/ids'
import { money, num, unitLabel } from '../lib/format'

type XLSXModule = {
  read: (data: ArrayBuffer, opts: { type: 'array' }) => { SheetNames: string[]; Sheets: Record<string, unknown> }
  utils: {
    sheet_to_json: <T = any>(sheet: unknown, opts: { defval: any }) => T[]
  }
}

type Preview = {
  ingredients: Ingredient[]
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

function normalizeUnit(text: string): Unit {
  const normalized = text.trim().toLowerCase()
  if (normalized.includes('ml')) return 'ml'
  if (normalized.includes('τεμ') || normalized.includes('pc') || normalized.includes('τμχ')) return 'pc'
  return 'g'
}

function parseWorkbook(workbook: Workbook, sourceLabel: string, XLSX: XLSXModule): Preview {
  if (!workbook.SheetNames.length) throw new Error('Δεν βρέθηκε φύλλο στο αρχείο.')
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const warnings: string[] = []
  const ingredients: Ingredient[] = []

  rows.forEach((row, idx) => {
    const name = String(row['Name'] ?? row['Όνομα'] ?? row['Υλικό'] ?? '').trim()
    if (!name) {
      warnings.push(`Γραμμή ${idx + 2}: λείπει όνομα υλικού`)
      return
    }

    const unit = normalizeUnit(String(row['Unit'] ?? row['Μονάδα'] ?? row['Μονάδα μέτρησης'] ?? ''))
    const packSize = parseNumber(row['Pack Size'] ?? row['PackSize'] ?? row['Συσκευασία'] ?? row['Ποσότητα'] ?? row['Qty'])
    const packCost = parseNumber(row['Pack Cost'] ?? row['Cost'] ?? row['Κόστος'] ?? row['Τιμή'] ?? row['€'])
    const supplier = String(row['Supplier'] ?? row['Προμηθευτής'] ?? '').trim()
    const notes = String(row['Notes'] ?? row['Σημειώσεις'] ?? '').trim()

    if (!packSize || packSize <= 0) warnings.push(`Γραμμή ${idx + 2}: άγνωστη ποσότητα, καταγράφηκε ως 0`)
    if (packCost < 0) warnings.push(`Γραμμή ${idx + 2}: αρνητικό κόστος, καταγράφηκε ως 0`)

    ingredients.push({
      id: uid('ing'),
      name,
      unit,
      packSize: packSize > 0 ? packSize : 0,
      packCost: packCost >= 0 ? packCost : 0,
      supplier: supplier || undefined,
      notes: notes || undefined,
      updatedAt: new Date().toISOString(),
    })
  })

  if (!ingredients.length) throw new Error('Δεν βρέθηκαν υλικά στο φύλλο.')

  return { ingredients, warnings, sourceLabel }
}

export function ExcelImportModal(props: {
  existingCount: number
  onApply: (mode: 'append' | 'replace', ingredients: Ingredient[]) => void
  onClose: () => void
}) {
  const [preview, setPreview] = React.useState<Preview | null>(null)
  const [mode, setMode] = React.useState<'append' | 'replace'>('append')
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
        onClick={() => preview && props.onApply(mode, preview.ingredients)}
      >
        {mode === 'append' ? 'Προσθήκη στη λίστα' : 'Αντικατάσταση λίστας'}
      </button>
    </>
  )

  return (
    <Modal title="Εισαγωγή από Excel ή σύνδεσμο" onClose={props.onClose} actions={actionButtons}>
      <div className="split">
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="muted">
            Άνοιξε ένα αρχείο Excel (.xlsx) ή επικόλλησε έναν ασφαλή σύνδεσμο (όπως το παρεχόμενο SharePoint). Χρειάζεται σύνδεση στο διαδίκτυο για να διαβαστεί το αρχείο Excel.
            Χρησιμοποιούμε το πρώτο φύλλο με στήλες: Όνομα, Μονάδα (g/ml/τεμ), Ποσότητα συσκευασίας, Κόστος συσκευασίας, Προμηθευτής (προαιρετικό).
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

          <div className="row">
            <label className="row" style={{ gap: 6 }}>
              <input
                type="radio"
                name="excel-mode"
                checked={mode === 'append'}
                onChange={() => setMode('append')}
              />
              <span>Πρόσθεσε στα υπάρχοντα ({props.existingCount} υλικά τώρα)</span>
            </label>
            <label className="row" style={{ gap: 6 }}>
              <input
                type="radio"
                name="excel-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              <span>Αντικατάσταση με όσα βρεθούν</span>
            </label>
          </div>

          {error ? <div className="errorBox">{error}</div> : null}
          {preview ? (
            <div className="okBox">
              Βρέθηκαν {preview.ingredients.length} υλικά από το {preview.sourceLabel}.
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
                <th>Όνομα</th>
                <th>Μονάδα</th>
                <th>Ποσότητα συσκ.</th>
                <th>Κόστος συσκ.</th>
                <th>Προμηθευτής</th>
              </tr>
            </thead>
            <tbody>
              {(preview?.ingredients.slice(0, 10) ?? []).map((ing, idx) => (
                <tr key={ing.id + idx}>
                  <td><b>{ing.name}</b></td>
                  <td><span className="pill">{unitLabel(ing.unit)}</span></td>
                  <td>{num(ing.packSize)} {unitLabel(ing.unit)}</td>
                  <td>{money(ing.packCost)}</td>
                  <td className="muted">{ing.supplier ?? '-'}</td>
                </tr>
              ))}
              {!(preview?.ingredients.length) ? (
                <tr><td colSpan={5} className="muted">Πρόσθεσε αρχείο για να δεις προεπισκόπηση.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
