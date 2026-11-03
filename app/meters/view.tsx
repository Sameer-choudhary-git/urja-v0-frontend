'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Download, Globe2, Loader2, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { label } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { downloadMetersCsv, geoJsonUrl } from '@/lib/exportCsv'
import { Card, Empty, ErrorState, Loading, PageHeader, Pagination, Select, StatusBadge } from '@/components/ui'

const LIMIT = 25
const FILTERS = ['status', 'phase', 'installationType', 'make', 'build'] as const

export function MetersView() {
  const url = useUrlState()
  const query = {
    q: url.get('q'),
    status: url.get('status'),
    phase: url.get('phase'),
    installationType: url.get('installationType'),
    make: url.get('make'),
    build: url.get('build'),
    transformer: url.get('transformer'),
    node: url.get('node'),
    hasIssues: url.get('hasIssues'),
    sort: url.get('sort', 'id'),
    order: url.get('order', 'asc'),
    limit: LIMIT,
    offset: Number(url.get('offset', '0')) || 0,
  }
  const key = JSON.stringify(query)
  const { data, error, loading, reload } = useApi(key, (s) => api.meters(query, s))

  // Debounced free-text search
  const [text, setText] = useState(query.q)
  useEffect(() => setText(query.q), [query.q])
  useEffect(() => {
    if (text === query.q) return
    const t = setTimeout(() => url.set({ q: text }), 300)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const facets = data?.facets ?? {}
  const options = (field: string) => [
    { value: '', label: 'All' },
    ...Object.entries(facets[field] ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: `${label(value)} (${count})` })),
    // keep the selected value visible even when it has no matches
    ...(query[field as keyof typeof query] && !(facets[field] ?? {})[String(query[field as keyof typeof query])] ? [{ value: String(query[field as keyof typeof query]), label: label(String(query[field as keyof typeof query])) }] : []),
  ]
  const active = [...FILTERS, 'transformer', 'node', 'hasIssues', 'q'].filter((f) => url.get(f))

  const filters = { q: query.q, status: query.status, phase: query.phase, installationType: query.installationType, make: query.make, build: query.build, transformer: query.transformer, node: query.node, hasIssues: query.hasIssues }
  const [exporting, setExporting] = useState(false)
  const exportCsv = async () => {
    setExporting(true)
    try {
      await downloadMetersCsv({ ...filters, sort: query.sort, order: query.order })
    } finally {
      setExporting(false)
    }
  }
  const exportActions = (
    <>
      <button onClick={exportCsv} disabled={exporting || !data} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 text-xs font-medium text-ink hover:bg-hover disabled:opacity-50">
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} CSV{data ? ` (${data.page.total})` : ''}
      </button>
      <a href={geoJsonUrl(filters)} download="urja-meters.geojson" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 text-xs font-medium text-ink hover:bg-hover">
        <Globe2 size={13} /> GeoJSON
      </a>
    </>
  )

  const sortBy = (field: string) => url.set({ sort: field, order: query.sort === field && query.order === 'asc' ? 'desc' : 'asc' })
  const SortHead = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button onClick={() => sortBy(field)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink">
      {children}
      {query.sort === field && (query.order === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  )

  return (
    <>
      <PageHeader title="Meters" caption="Filter, sort and open any meter. Filters are in the URL, so a view can be shared; export the filtered list for analysis." meta={data?.meta} action={exportActions} />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(5,1fr)_auto]">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            Meter ID or serial
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-subtle" />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. J1001 or GE84" className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-2.5 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            </div>
          </label>
          <Select label="Status" value={query.status} onChange={(v) => url.set({ status: v })} options={options('status')} />
          <Select label="Phase" value={query.phase} onChange={(v) => url.set({ phase: v })} options={options('phase')} />
          <Select label="Installation" value={query.installationType} onChange={(v) => url.set({ installationType: v })} options={options('installationType')} />
          <Select label="Make" value={query.make} onChange={(v) => url.set({ make: v })} options={options('make')} />
          <Select label="Data issues" value={query.hasIssues} onChange={(v) => url.set({ hasIssues: v })} options={[{ value: '', label: 'Any' }, { value: 'true', label: 'With issues' }, { value: 'false', label: 'Clean only' }]} />
          <div className="flex items-end">
            <button disabled={active.length === 0} onClick={() => url.set(Object.fromEntries(active.map((f) => [f, undefined])))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs font-medium text-ink-2 disabled:opacity-40 enabled:hover:bg-hover">
              <X size={13} /> Clear
            </button>
          </div>
        </div>
        {(query.transformer || query.node || query.build) && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {query.transformer && <Chip onClear={() => url.set({ transformer: undefined })}>Transformer {query.transformer}</Chip>}
            {query.node && <Chip onClear={() => url.set({ node: undefined })}>Under {query.node}</Chip>}
            {query.build && <Chip onClear={() => url.set({ build: undefined })}>Build {query.build}</Chip>}
          </div>
        )}
      </Card>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Card className="overflow-hidden">
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {data.data.length === 0 ? (
              <Empty text="No meters match these filters." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-xs">
                  <thead className="border-b border-line bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3"><SortHead field="id">Meter</SortHead></th>
                      <th className="px-4 py-3"><SortHead field="serialNumber">Serial</SortHead></th>
                      <th className="px-4 py-3"><SortHead field="make">Make</SortHead></th>
                      <th className="px-4 py-3">Phase</th>
                      <th className="px-4 py-3">Installation</th>
                      <th className="px-4 py-3"><SortHead field="status">Status</SortHead></th>
                      <th className="px-4 py-3">Transformer</th>
                      <th className="px-4 py-3">Zone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {data.data.map((m) => (
                      <tr key={m.id} className="hover:bg-hover">
                        <td className="px-4 py-3">
                          <Link href={`/meters/${m.id}`} className="font-mono font-semibold text-brand hover:underline">{m.id}</Link>
                          {m.issues.length > 0 && <span title={m.issues.map((i) => i.detail).join('\n')}><AlertCircle size={12} className="ml-1.5 inline text-amber-500" /></span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-2">{m.serialNumber}</td>
                        <td className="px-4 py-3">{m.make}</td>
                        <td className="px-4 py-3">{label(m.phase)}</td>
                        <td className="px-4 py-3">{label(m.installationType)}</td>
                        <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-3">
                          <Link href={`/transformers/${m.network.transformer.code}`} className="hover:underline">
                            <span className="font-mono text-ink">{m.network.transformer.code}</span> <span className="text-subtle">{m.network.transformer.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink-2">{m.network.zone.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-line">
              <Pagination total={data.page.total} limit={data.page.limit} offset={data.page.offset} onChange={(offset) => url.set({ offset })} />
            </div>
          </div>
        </Card>
      )}
    </>
  )
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 font-medium text-brand">
      {children}
      <button onClick={onClear} aria-label="Remove filter"><X size={12} /></button>
    </span>
  )
}
