import React from 'react'
import type { AppData } from '../types'
import { exportJson, importJson } from '../lib/storage'
import { ExcelImportModal } from './ExcelImportModal'

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function FileButtons(props: {
  data: AppData
  onImport: (data: AppData) => void
  onReset: () => void
}) {
  const fileRef = React.useRef<HTMLInputElement | null>(null)
  const [excelOpen, setExcelOpen] = React.useState(false)

  return (
    <div className="row">
      <button
        className="btn"
        onClick={() => {
          const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
          downloadText(`syntages-zois_${ts}.json`, exportJson(props.data))
        }}
      >
        Εξαγωγή JSON (αντίγραφο)
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const text = await file.text()
          try {
            const imported = importJson(text)
            props.onImport(imported)
          } catch (err) {
            alert(`Δεν έγινε η εισαγωγή: ${(err as Error).message}`)
          } finally {
            if (fileRef.current) fileRef.current.value = ''
          }
        }}
      />

      <button className="btn" onClick={() => fileRef.current?.click()}>
        Εισαγωγή JSON
      </button>

      <button className="btn" onClick={() => setExcelOpen(true)}>
        Εισαγωγή Excel / Συνδέσμου
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
          existingCount={props.data.ingredients.length}
          onApply={(mode, ingredients) => {
            const nextIngredients = mode === 'append'
              ? [...props.data.ingredients, ...ingredients]
              : ingredients
            props.onImport({ ...props.data, ingredients: nextIngredients, exportedAt: new Date().toISOString() })
            setExcelOpen(false)
          }}
          onClose={() => setExcelOpen(false)}
        />
      ) : null}
    </div>
  )
}
