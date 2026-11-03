'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { dateTime, label } from '@/lib/format'
import type { Anomaly } from '@/lib/types'
import { SeverityBadge } from './ui'

/** What each rule means, for operators (thresholds live in the API's domain/anomalies.ts). */
export const RULES: Record<string, string> = {
  voltage_out_of_range: 'R-phase voltage outside 230 V ± 6% (216.2–243.8 V)',
  low_power_factor: 'Power factor over the window below 0.85',
  zero_consumption: '24 h or more of zero use on a meter that is not decommissioned',
  consumption_spike: 'A half hour above median + 6 × MAD (and at least 0.5 kWh)',
  decommissioned_but_consuming: 'A decommissioned meter that recorded consumption',
  data_gap: 'Half hours with no usage figure',
  register_decreased: 'A cumulative register that went down',
  transformer_overload: 'Summed demand at 80% (warning) or 100% (critical) of the DT rating',
}

export function AnomalyList({ anomalies, linkSubjects = false }: { anomalies: Anomaly[]; linkSubjects?: boolean }) {
  if (anomalies.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
        <CheckCircle2 size={15} /> No anomalies in this window.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-line-soft">
      {anomalies.map((a, i) => (
        <li key={`${a.subject}-${a.code}-${i}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="w-24 shrink-0">
            <SeverityBadge severity={a.severity} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-ink" title={RULES[a.code]}>
              {label(a.code)}
              {linkSubjects && (
                <>
                  {' · '}
                  <Link className="font-mono text-brand hover:underline" href={a.subject.startsWith('DT-') ? `/transformers/${a.subject}` : `/meters/${a.subject}`}>
                    {a.subject}
                  </Link>
                </>
              )}
            </div>
            <div className="mt-0.5 text-xs text-ink-2">{a.message}</div>
          </div>
          <div className="shrink-0 text-[11px] text-subtle">{a.at ? dateTime(a.at) : 'whole window'}</div>
        </li>
      ))}
    </ul>
  )
}
