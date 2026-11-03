/** Display helpers. The API speaks IST (+05:30); so does the UI. */

const IST = 'Asia/Kolkata'

export const nf = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined ? '—' : value.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

export const pct = (value: number | null | undefined, digits = 1): string =>
  value === null || value === undefined ? '—' : `${value.toFixed(digits)}%`

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { timeZone: IST, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function shortTime(iso: string, granularity: 'raw' | 'hour' | 'day' = 'raw'): string {
  const d = new Date(iso)
  if (granularity === 'day') return d.toLocaleDateString('en-IN', { timeZone: IST, day: '2-digit', month: 'short' })
  return d.toLocaleString('en-IN', { timeZone: IST, day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function age(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`
  return `${Math.floor(seconds / 86400)} d ago`
}

export const label = (value: string): string =>
  ({
    installed: 'Installed', faulty: 'Faulty', decommissioned: 'Decommissioned', unknown: 'Unknown',
    single: 'Single phase', three: 'Three phase', whole_current: 'Whole current', ct_operated: 'CT operated',
    zone: 'Zone', circle: 'Circle', division: 'Division', subdivision: 'Subdivision', substation: 'Substation',
    feeder: 'Feeder', transformer: 'Transformer', info: 'Info', warning: 'Warning', critical: 'Critical',
  })[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export const STATUS_COLOR: Record<string, string> = {
  installed: '#34d399',
  faulty: '#fb7185',
  decommissioned: '#94a3b8',
  unknown: '#a78bfa',
}

export const SEVERITY_COLOR: Record<string, string> = {
  critical: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
}

/** Energy history on the portal covers 1–30 June 2026 (PROTOCOL.md 3.3). */
export const HISTORY = { first: '2026-06-01', last: '2026-06-30' }
