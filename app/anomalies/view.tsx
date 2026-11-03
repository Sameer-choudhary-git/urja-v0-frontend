'use client'

import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf, SEVERITY_COLOR } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { AnomalyList, RULES } from '@/components/AnomalyList'
import { Card, ErrorState, Loading, PageHeader, SectionTitle, Segmented, Select } from '@/components/ui'
import { toApiWindow, WindowPicker } from '@/components/WindowPicker'

type Scope = 'transformer' | 'node' | 'meterIds'

export function AnomaliesView() {
  const url = useUrlState()
  const initialScope: Scope = url.get('node') ? 'node' : url.get('meterIds') ? 'meterIds' : 'transformer'
  const [scope, setScope] = useState<Scope>(initialScope)
  const [value, setValue] = useState(url.get(initialScope) || (initialScope === 'transformer' ? 'DT-007' : ''))
  const [window, setWindow] = useState({ from: url.get('from', '2026-06-24'), to: url.get('to', '2026-06-30') })
  const severity = url.get('severity')

  // The scan only runs for what is in the URL, so a result can be shared and Back works.
  const run = url.get('transformer') || url.get('node') || url.get('meterIds')
  const query = { [initialScope]: url.get(initialScope), ...toApiWindow({ from: url.get('from', '2026-06-24'), to: url.get('to', '2026-06-30') }), severity }
  const scan = useApi(run ? JSON.stringify(query) : null, (s) => api.anomalies(query, s))
  const transformers = useApi('dts', (s) => api.transformers({ limit: 200 }, s))

  useEffect(() => {
    if (scope === 'transformer' && !value) setValue('DT-007')
  }, [scope, value])

  const submit = () =>
    url.set({ transformer: undefined, node: undefined, meterIds: undefined, [scope]: value.trim(), from: window.from, to: window.to })

  const d = scan.data?.data

  return (
    <>
      <PageHeader title="Anomalies" caption="Run the anomaly rules over all meters of a transformer, a network node, or a list of meters (up to 50 meters per scan)." meta={scan.data?.meta} />

      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            Scope
            <Segmented value={scope} onChange={(s) => { setScope(s); setValue('') }} options={[{ value: 'transformer', label: 'Transformer' }, { value: 'node', label: 'Network node' }, { value: 'meterIds', label: 'Meter IDs' }]} />
          </div>
          {scope === 'transformer' ? (
            <Select label="Transformer" value={value} onChange={setValue} className="min-w-56" options={(transformers.data?.data ?? []).map((t) => ({ value: t.code, label: `${t.code} · ${t.name} (${t.meterCount})` }))} />
          ) : (
            <label className="flex min-w-72 flex-col gap-1 text-[11px] font-medium text-muted">
              {scope === 'node' ? 'Node id (from the Network page)' : 'Meter IDs, comma separated'}
              <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={scope === 'node' ? 'Z-01.C-01.D-07.SD-07' : 'J100000,J100001'} className="h-9 rounded-lg border border-line px-2.5 font-mono text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </label>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <WindowPicker value={window} onChange={setWindow} />
          <button onClick={submit} disabled={!value.trim()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-accent px-4 text-xs font-semibold text-canvas shadow-[0_0_24px_-6px_#2dd4bf] transition hover:brightness-110 disabled:opacity-50">
            <Play size={13} fill="currentColor" /> Run scan
          </button>
        </div>
      </Card>

      {!run ? (
        <Rules />
      ) : scan.error ? (
        <ErrorState error={scan.error} onRetry={scan.reload} />
      ) : !d ? (
        <Loading text="Fetching readings and running the rules… (first scan of a scope can take a few seconds)" />
      ) : (
        <div className={`grid gap-5 lg:grid-cols-[300px_1fr] ${scan.loading ? 'opacity-60' : ''}`}>
          <Card className="h-fit p-5">
            <SectionTitle title="Summary" caption={`${d.scope} · ${d.metersScanned} meters scanned`} />
            <div className="mt-4 space-y-2">
              {(['critical', 'warning', 'info'] as const).map((s) => (
                <div key={s} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />{label(s)}</span>
                  <b>{nf(d.counts.bySeverity[s] ?? 0)}</b>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">By rule</div>
              {Object.entries(d.counts.byCode).map(([code, n]) => (
                <div key={code} className="flex justify-between py-1 text-xs" title={RULES[code]}>
                  <span className="text-ink-2">{label(code)}</span>
                  <b>{n}</b>
                </div>
              ))}
              {Object.keys(d.counts.byCode).length === 0 && <div className="text-xs text-subtle">Nothing found.</div>}
            </div>
            <div className="mt-5">
              <Select label="Minimum severity" value={severity} onChange={(v) => url.set({ severity: v, transformer: url.get('transformer'), node: url.get('node'), meterIds: url.get('meterIds') })} options={[{ value: '', label: 'All' }, { value: 'warning', label: 'Warning and above' }, { value: 'critical', label: 'Critical only' }]} />
            </div>
            {d.failed.length > 0 && (
              <div className="mt-4 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-200">
                Readings failed for {d.failed.length} meter(s): {d.failed.map((f) => f.meterId).join(', ')}. The rest are still shown.
              </div>
            )}
          </Card>
          <Card className="p-5">
            <SectionTitle title="Findings" caption="Most severe first" />
            <div className="mt-2"><AnomalyList anomalies={d.anomalies} linkSubjects /></div>
          </Card>
        </div>
      )}
    </>
  )
}

function Rules() {
  return (
    <Card className="p-5">
      <SectionTitle title="The rules" caption="Explainable thresholds, not a model. Pick a scope above and run a scan." />
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {Object.entries(RULES).map(([code, text]) => (
          <li key={code} className="rounded-lg border border-line p-3">
            <div className="text-xs font-semibold text-ink">{label(code)}</div>
            <div className="mt-1 text-xs text-muted">{text}</div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
