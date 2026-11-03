'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '@/lib/api'
import { CHART, TOOLTIP } from '@/lib/theme'
import { dateTime, label, nf, pct, shortTime } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { AnomalyList } from '@/components/AnomalyList'
import { Card, ErrorState, Field, Loading, PageHeader, SectionTitle, StatusBadge, TextLink } from '@/components/ui'
import { toApiWindow, WindowPicker, type Window } from '@/components/WindowPicker'

export function TransformerView({ code }: { code: string }) {
  const detail = useApi(code, (s) => api.transformer(code, s))
  const [window, setWindow] = useState<Window>({ from: '2026-06-29', to: '2026-06-30' })
  const load = useApi(detail.data ? `${code}|${window.from}|${window.to}` : null, (s) => api.transformerLoad(code, toApiWindow(window), s))

  if (detail.error) {
    return (
      <>
        <Back />
        <ErrorState error={detail.error} onRetry={detail.reload} />
      </>
    )
  }
  if (!detail.data) return <Loading />
  const t = detail.data.data
  const l = load.data?.data
  const capacity = l?.capacityKva ?? t.capacityKva
  const nodes = t.networkPath.split('.')

  return (
    <>
      <Back />
      <PageHeader title={<span><span className="font-mono">{t.code}</span> · {t.name}</span>} caption={t.aliases.length ? `Also called “${t.aliases.join('”, “')}” in the portal export` : `Feeder ${t.feederCode}`} meta={detail.data.meta} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.6fr]">
        <Card className="p-5">
          <SectionTitle title="Transformer" />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Rating">{nf(t.capacityKva)} kVA</Field>
            <Field label="Meters">{t.meterCount}</Field>
            <Field label="Feeder"><span className="font-mono">{t.feederCode}</span></Field>
            <Field label="Network path">
              <Link className="font-mono text-xs text-brand hover:underline" href={`/network/${nodes.slice(0, -1).join('.')}`}>
                {t.networkPath}
              </Link>
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-xs">
            {Object.entries(t.statusCounts).map(([s, c]) => (
              <span key={s} className="flex items-center gap-2"><StatusBadge status={s} /> <b>{c}</b></span>
            ))}
          </div>
          <div className="mt-5 max-h-72 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-panel-2 text-[11px] uppercase tracking-wider text-muted">
                <tr><th className="px-3 py-2">Meter</th><th className="px-3 py-2">Make</th><th className="px-3 py-2">Phase</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {t.meters.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2"><TextLink href={`/meters/${m.id}`} className="font-mono">{m.id}</TextLink></td>
                    <td className="px-3 py-2">{m.make}</td>
                    <td className="px-3 py-2">{label(m.phase)}</td>
                    <td className="px-3 py-2"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-xs"><TextLink href={`/anomalies?transformer=${t.code}`}>Scan this transformer’s meters for anomalies →</TextLink></div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Loading vs rating" caption="Summed apparent power of the meters on this DT per half hour (kVAh × 2), against its kVA rating. A lower bound: losses and unmetered load are invisible." />
          <div className="mt-4"><WindowPicker value={window} onChange={setWindow} /></div>
          {load.error ? (
            <ErrorState className="mt-4" error={load.error} onRetry={load.reload} />
          ) : !l ? (
            <Loading text="Fetching readings for every meter on this DT…" />
          ) : (
            <div className={load.loading ? 'opacity-60' : ''}>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Peak">{l.peak ? `${nf(l.peak.kva, 1)} kVA` : '—'}</Field>
                <Field label="Peak utilisation">{pct(l.peakUtilisationPercent)}</Field>
                <Field label="Average">{nf(l.averageKva, 1)} kVA</Field>
                <Field label="Meters reporting">{l.metersReporting}/{t.meterCount}</Field>
              </div>
              {l.peak && <p className="mt-2 text-[11px] text-subtle">Peak at {dateTime(l.peak.intervalStart)}</p>}
              <div className="mt-4 h-72">
                <ResponsiveContainer>
                  <AreaChart data={l.points} margin={{ left: -6, right: 8 }}>
                    <defs>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={CHART.brand} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={CHART.grid} />
                    <XAxis dataKey="intervalStart" tickFormatter={(v) => shortTime(v)} tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 10, fill: CHART.tick }} domain={[0, (max: number) => Math.max(max, capacity ? capacity * 1.05 : max)]} />
                    <Tooltip {...TOOLTIP} labelFormatter={(v) => dateTime(String(v))} formatter={(v) => [`${nf(Number(v), 2)} kVA`, 'Load']} />
                    {capacity && <ReferenceLine y={capacity} stroke={CHART.danger} strokeDasharray="5 4" label={{ value: `Rating ${capacity} kVA`, fontSize: 10, fill: CHART.danger, position: 'insideTopRight' }} />}
                    {capacity && <ReferenceLine y={capacity * 0.8} stroke={CHART.warn} strokeDasharray="3 4" label={{ value: '80%', fontSize: 10, fill: CHART.warn, position: 'insideTopRight' }} />}
                    <Area dataKey="kva" stroke={CHART.brand} fill="url(#loadFill)" fillOpacity={1} strokeWidth={1.6} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {l.failed.length > 0 && <p className="mt-2 text-xs text-amber-300">Readings could not be fetched for {l.failed.map((f) => f.meterId).join(', ')}; the load shown leaves them out.</p>}
              <div className="mt-4">
                <AnomalyList anomalies={l.anomalies} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

function Back() {
  return (
    <Link href="/transformers" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
      <ArrowLeft size={13} /> All transformers
    </Link>
  )
}
