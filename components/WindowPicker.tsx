'use client'

import { HISTORY } from '@/lib/format'
import { DateInput } from './ui'

export interface Window {
  from: string
  to: string
}

const PRESETS: { label: string; value: Window }[] = [
  { label: 'Last day', value: { from: '2026-06-30', to: '2026-06-30' } },
  { label: 'Last 7 days', value: { from: '2026-06-24', to: '2026-06-30' } },
  { label: 'All of June', value: { from: '2026-06-01', to: '2026-06-30' } },
]

/**
 * The window as API query values. The portal's newest reading is 30 June 23:30,
 * which closes the 23:00–23:30 half hour; the last half hour of June has no
 * closing reading. Ending a window on 30 June therefore ends it at 23:30, so
 * every scan does not report a one-interval "data gap" that is only the end
 * of the history.
 */
export function toApiWindow(w: Window): { from: string; to: string } {
  return { from: w.from, to: w.to === HISTORY.last ? `${HISTORY.last}T23:30:00+05:30` : w.to }
}

/** Whole IST days, both inclusive (the API treats a date-only `to` as the end of that day). Max 31 days. */
export function WindowPicker({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  const set = (patch: Partial<Window>) => {
    const next = { ...value, ...patch }
    if (next.from > next.to) {
      if (patch.from) next.to = next.from
      else next.from = next.to
    }
    onChange(next)
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateInput label="From" value={value.from} min={HISTORY.first} max={HISTORY.last} onChange={(from) => from && set({ from })} />
      <DateInput label="To (inclusive)" value={value.to} min={HISTORY.first} max={HISTORY.last} onChange={(to) => to && set({ to })} />
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => onChange(p.value)}
            className={`h-9 rounded-lg border px-3 text-xs font-medium ${value.from === p.value.from && value.to === p.value.to ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink-2 hover:bg-hover'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <span className="pb-2 text-[11px] text-subtle">Portal history: 1–30 June 2026</span>
    </div>
  )
}
