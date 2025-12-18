import type { Unit } from '../types'

export function money(n: number) {
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

export function pct(n: number) {
  if (!Number.isFinite(n)) return '0.0'
  return (n * 100).toFixed(1)
}

export function num(n: number) {
  if (!Number.isFinite(n)) return '0'
  const s = n.toFixed(3)
  return s.replace(/\.000$/, '').replace(/(\.[0-9]*?)0+$/, '$1')
}

const unitLabels: Record<Unit, string> = {
  g: 'γρ',
  ml: 'ml',
  pc: 'τεμ',
}

export function unitLabel(unit: Unit): string {
  return unitLabels[unit] ?? unit
}
