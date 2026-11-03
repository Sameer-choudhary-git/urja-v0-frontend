'use client'

import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { Card, Empty, ErrorState, Loading, PageHeader, Pagination, SectionTitle, StatusBadge, TextLink } from '@/components/ui'
import { StatusBar } from '../view'

const LIMIT = 25

export function NodeView({ nodeId }: { nodeId: string }) {
  const url = useUrlState()
  const offset = Number(url.get('offset', '0')) || 0
  const { data, error, loading, reload } = useApi(`${nodeId}|${offset}`, (s) => api.node(nodeId, { limit: LIMIT, offset }, s))

  if (error) {
    return (
      <>
        <Back />
        <ErrorState error={error} onRetry={reload} />
      </>
    )
  }
  if (!data) return <Loading />
  const n = data.data
  const crumbs = n.breadcrumb.filter((b) => b.id !== n.id)

  return (
    <>
      <Back />
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {crumbs.map((b) => (
          <span key={b.id} className="flex items-center gap-1.5">
            <Link className="hover:text-brand hover:underline" href={`/network/${b.id}`}>
              {b.name}
            </Link>
            <ChevronRight size={12} className="text-faint" />
          </span>
        ))}
      </div>
      <PageHeader title={n.name} caption={`${label(n.level)} · ${n.id}`} meta={data.meta} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <SectionTitle title={n.children.length ? `${label(n.children[0].level)}s below` : 'Below this node'} caption={`${nf(n.meterCount)} meters in total`} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            {Object.entries(n.statusCounts).map(([s, c]) => (
              <span key={s} className="flex items-center gap-2">
                <StatusBadge status={s} /> <b>{c}</b>
              </span>
            ))}
          </div>
          <ul className="mt-4 divide-y divide-line-soft">
            {n.children.map((c) => (
              <li key={c.id}>
                <Link href={c.level === 'transformer' ? `/transformers/${c.code}` : `/network/${c.id}`} className="flex items-center gap-3 py-2.5 hover:bg-hover">
                  <span className="text-xs font-medium text-ink">{c.name}</span>
                  <span className="font-mono text-[10px] text-subtle">{c.code}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <StatusBar counts={c.statusCounts} total={c.meterCount} />
                    <span className="w-8 text-right text-xs font-semibold">{c.meterCount}</span>
                  </span>
                </Link>
              </li>
            ))}
            {n.children.length === 0 && <Empty text="No child nodes." />}
          </ul>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <TextLink href={`/meters?node=${n.id}`}>Filter meters under this node →</TextLink>
            <TextLink href={`/anomalies?node=${n.id}`}>Scan for anomalies →</TextLink>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle title="Meters" caption="Every meter under this node" />
          </div>
          <div className={loading ? 'opacity-60' : ''}>
            <table className="w-full text-left text-xs">
              <thead className="border-y border-line bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5">Meter</th>
                  <th className="px-4 py-2.5">Make</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Phase</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="hidden px-4 py-2.5 sm:table-cell">Transformer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {n.meters.map((m) => (
                  <tr key={m.id} className="hover:bg-hover">
                    <td className="px-4 py-2.5"><TextLink href={`/meters/${m.id}`} className="font-mono">{m.id}</TextLink></td>
                    <td className="px-4 py-2.5">{m.make}</td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">{label(m.phase)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                    <td className="hidden px-4 py-2.5 font-mono sm:table-cell">{m.network.transformer.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-line">
              <Pagination total={n.page.total} limit={n.page.limit} offset={n.page.offset} onChange={(o) => url.set({ offset: o })} />
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

function Back() {
  return (
    <Link href="/network" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
      <ArrowLeft size={13} /> Network tree
    </Link>
  )
}
