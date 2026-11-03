'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf, STATUS_COLOR } from '@/lib/format'
import type { NodeTree } from '@/lib/types'
import { useApi } from '@/lib/useApi'
import { Card, ErrorState, Loading, PageHeader, Segmented } from '@/components/ui'

export function NetworkView() {
  const [status, setStatus] = useState<'' | 'installed' | 'faulty' | 'decommissioned'>('')
  const { data, error, reload } = useApi(`tree|${status}`, (s) => api.hierarchy({ depth: 7, status }, s))
  const [open, setOpen] = useState<Set<string>>(new Set())
  // Open the zones once, so the first level of detail is visible straight away.
  useEffect(() => {
    if (data && open.size === 0) setOpen(new Set(data.data.map((z) => z.id)))
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <>
      <PageHeader
        title="Network"
        caption="Zone › Circle › Division › Subdivision › Substation › Feeder › Transformer. Codes repeat under different parents, so nodes are identified by their full path."
        meta={data?.meta}
        action={<Segmented value={status} onChange={setStatus} options={[{ value: '', label: 'All' }, { value: 'installed', label: 'Installed' }, { value: 'faulty', label: 'Faulty' }, { value: 'decommissioned', label: 'Decomm.' }]} />}
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Card className="p-3">
          <div className="flex items-center justify-between px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            <span>Node</span>
            <span>Meters by status</span>
          </div>
          {data.data.map((node) => (
            <TreeRow key={node.id} node={node} depth={0} open={open} toggle={toggle} />
          ))}
        </Card>
      )}
    </>
  )
}

function TreeRow({ node, depth, open, toggle }: { node: NodeTree; depth: number; open: Set<string>; toggle: (id: string) => void }) {
  const isOpen = open.has(node.id)
  const hasChildren = (node.children?.length ?? 0) > 0
  const href = node.level === 'transformer' ? `/transformers/${node.code}` : `/network/${node.id}`
  return (
    <>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-hover" style={{ paddingLeft: 12 + depth * 20 }}>
        <button onClick={() => hasChildren && toggle(node.id)} className="grid h-5 w-5 place-items-center text-subtle" aria-label={isOpen ? 'Collapse' : 'Expand'}>
          {hasChildren ? isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} /> : null}
        </button>
        <span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-subtle">{label(node.level)}</span>
        <Link href={href} className="truncate text-xs font-medium text-ink hover:text-brand hover:underline">
          {node.name}
        </Link>
        <span className="font-mono text-[10px] text-subtle">{node.code}</span>
        <span className="ml-auto flex shrink-0 items-center gap-3">
          <StatusBar counts={node.statusCounts} total={node.meterCount} />
          <span className="w-10 text-right text-xs font-semibold text-ink">{nf(node.meterCount)}</span>
        </span>
      </div>
      {isOpen && node.children?.map((child) => <TreeRow key={child.id} node={child} depth={depth + 1} open={open} toggle={toggle} />)}
    </>
  )
}

export function StatusBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <span className="hidden h-2 w-28 overflow-hidden rounded-full bg-track sm:flex" title={Object.entries(counts).map(([k, v]) => `${label(k)}: ${v}`).join(' · ')}>
      {['installed', 'faulty', 'decommissioned', 'unknown'].map((s) =>
        counts[s] ? <span key={s} style={{ width: `${(counts[s] / Math.max(total, 1)) * 100}%`, background: STATUS_COLOR[s] }} /> : null,
      )}
    </span>
  )
}
