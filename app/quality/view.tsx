'use client'

import { AlertTriangle, Database, Layers3 } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { Card, ErrorState, Loading, PageHeader, SectionTitle, Stat, TextLink } from '@/components/ui'

const EXPLAIN: Record<string, string> = {
  network_cell_repaired: 'A blank hierarchy cell in the portal was filled, because that name maps to exactly one code elsewhere (and vice versa).',
  network_cell_missing: 'A blank hierarchy cell that could not be repaired safely.',
  transformer_name_conflict: 'The portal uses a different name for this transformer code than its own transformer list.',
  unknown_value: 'A status, phase or installation type the API does not know yet; shown as “unknown”.',
}

export function QualityView() {
  const { data, error, reload } = useApi('quality', (s) => api.quality(s))
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!data) return <Loading />
  const d = data.data
  const scan = (d.scan ?? {}) as Record<string, unknown>

  return (
    <>
      <PageHeader title="Data quality" caption="What the API found, repaired or could not trust in the portal’s data. Nothing is hidden: every repair is also listed on the meter itself." meta={data.meta} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Meters checked" value={nf(d.summary.meters)} icon={<Database size={16} />} accent="#38bdf8" />
        <Stat label="Meters with issues" value={nf(d.summary.metersWithIssues)} hint={<TextLink href="/meters?hasIssues=true">List them →</TextLink>} icon={<AlertTriangle size={16} />} accent="#fbbf24" />
        <Stat label="Transformer name conflicts" value={nf(d.transformerNameConflicts.length)} icon={<Layers3 size={16} />} accent="#818cf8" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Issues by type" />
          <ul className="mt-4 space-y-4">
            {Object.entries(d.summary.issuesByCode).map(([code, count]) => (
              <li key={code}>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-ink">{label(code)}</span>
                  <b>{count}</b>
                </div>
                <p className="mt-1 text-xs text-muted">{EXPLAIN[code]}</p>
              </li>
            ))}
            {Object.keys(d.summary.issuesByCode).length === 0 && <li className="text-xs text-subtle">No issues.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Transformer name conflicts" caption="The transformer list is treated as canonical; other names are kept as aliases." />
          <ul className="mt-4 space-y-3">
            {d.transformerNameConflicts.map((c) => (
              <li key={c.code} className="rounded-lg border border-line p-3 text-xs">
                <TextLink href={`/transformers/${c.code}`} className="font-mono">{c.code}</TextLink>
                <div className="mt-1">Canonical: <b>{c.canonicalName}</b></div>
                <div className="text-muted">Also seen as: {c.aliases.join(', ')}</div>
              </li>
            ))}
            {d.transformerNameConflicts.length === 0 && <li className="text-xs text-subtle">None.</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <SectionTitle title="Raw export scan" caption="The full report from scanning the portal’s bulk export (PROTOCOL.md section 3.7)." />
        <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-200">{JSON.stringify(scan, null, 2)}</pre>
      </Card>
    </>
  )
}
