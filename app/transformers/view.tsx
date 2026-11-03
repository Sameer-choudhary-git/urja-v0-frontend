'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { nf } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { Card, Empty, ErrorState, Loading, PageHeader, Pagination } from '@/components/ui'

const LIMIT = 50

export function TransformersView() {
  const url = useUrlState()
  const query = { q: url.get('q'), sort: url.get('sort', 'code'), order: url.get('order', 'asc'), limit: LIMIT, offset: Number(url.get('offset', '0')) || 0 }
  const { data, error, loading, reload } = useApi(JSON.stringify(query), (s) => api.transformers(query, s))
  const [text, setText] = useState(query.q)
  useEffect(() => {
    if (text === query.q) return
    const t = setTimeout(() => url.set({ q: text }), 300)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  const Head = ({ field, children, right }: { field: string; children: React.ReactNode; right?: boolean }) => (
    <th className={`px-4 py-3 ${right ? 'text-right' : ''}`}>
      <button onClick={() => url.set({ sort: field, order: query.sort === field && query.order === 'asc' ? 'desc' : 'asc' })} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-ink">
        {children}
        {query.sort === field && (query.order === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  )

  return (
    <>
      <PageHeader title="Transformers" caption="Distribution transformers with rating, feeder and meter count. Open one for its loading against capacity." meta={data?.meta} />
      <Card className="mb-4 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-2.5 top-2.5 text-subtle" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Code, name or alias, e.g. Sanganer" className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-2.5 text-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
      </Card>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Card className={`overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          {data.data.length === 0 ? (
            <Empty text="No transformers match." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-xs">
                <thead className="border-b border-line bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <Head field="code">Code</Head>
                    <Head field="name">Name</Head>
                    <th className="px-4 py-3">Feeder</th>
                    <Head field="capacityKva" right>Rating (kVA)</Head>
                    <Head field="meterCount" right>Meters</Head>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {data.data.map((t) => (
                    <tr key={t.code} className="hover:bg-hover">
                      <td className="px-4 py-3"><Link href={`/transformers/${t.code}`} className="font-mono font-semibold text-brand hover:underline">{t.code}</Link></td>
                      <td className="px-4 py-3">
                        {t.name}
                        {t.aliases.length > 0 && <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300" title="The portal uses more than one name for this code">aka {t.aliases.join(', ')}</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-ink-2">{t.feederCode}</td>
                      <td className="px-4 py-3 text-right">{nf(t.capacityKva)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{t.meterCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line">
            <Pagination total={data.page.total} limit={data.page.limit} offset={data.page.offset} onChange={(offset) => url.set({ offset })} />
          </div>
        </Card>
      )}
    </>
  )
}
