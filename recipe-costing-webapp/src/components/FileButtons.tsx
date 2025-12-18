import React from 'react'
import type { AppData } from '../types'
import { exportJson, importJson } from '../lib/storage'

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

  return (
    <div className="row">
      <button
        className="btn"
        onClick={() => {
          const ts = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
          downloadText(`recipe-costing-export_${ts}.json`, exportJson(props.data))
        }}
      >
        Export JSON
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
            alert((err as Error).message)
          } finally {
            if (fileRef.current) fileRef.current.value = ''
          }
        }}
      />

      <button className="btn" onClick={() => fileRef.current?.click()}>
        Import JSON
      </button>

      <button
        className="btn danger"
        onClick={() => {
          const ok = confirm('This will delete all local data on this device. Continue?')
          if (ok) props.onReset()
        }}
      >
        Reset data
      </button>

      <button className="btn" onClick={() => window.print()}>
        Print or Save PDF
      </button>
    </div>
  )
}
