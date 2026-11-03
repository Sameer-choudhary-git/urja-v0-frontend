'use client'

import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '@/lib/api'
import { CHART, TOOLTIP } from '@/lib/theme'
import { dateTime, nf, shortTime } from '@/lib/format'
import type { Bucket, Granularity, RawReading } from '@/lib/types'
import { useApi } from '@/lib/useApi'
import { AnomalyList } from './AnomalyList'
import { Card, ErrorState, Field, Loading, SectionTitle, Segmented } from './ui'
import { toApiWindow, WindowPicker, type Window } from './WindowPicker'

interface Row {
  t: string
  kwh: number | null
  pf: number | null
  vMin: number | null
  vAvg: number | null
  vMax: number | null
}

const toRows = (items: RawReading[] | Bucket[], granularity: Granularity): Row[] =>
  granularity === 'raw'
    ? (items as RawReading[]).map((r) => ({ t: r.intervalStart, kwh: r.intervalKwh, pf: r.powerFactor, vMin: r.voltageR, vAvg: r.voltageR, vMax: r.voltageR }))
    : (items as Bucket[]).map((b) => ({ t: b.start, kwh: b.kwh, pf: b.powerFactor, vMin: b.voltageR?.min ?? null, vAvg: b.voltageR?.avg ?? null, vMax: b.voltageR?.max ?? null }))

export function ReadingsPanel({ meterId }: { meterId: string }) {
  const [window, setWindow] = useState<Window>({ from: '2026-06-24', to: '2026-06-30' })
  const [granularity, setGranularity] = useState<Granularity>('hour')
  const q = { ...toApiWindow(window), granularity }
  const readings = useApi(`${meterId}|${JSON.stringify(q)}`, (s) => api.readings(meterId, q, s))
  const anomalies = useApi(`${meterId}|${window.from}|${window.to}`, (s) => api.meterAnomalies(meterId, toApiWindow(window), s))

  const d = readings.data?.data
  const rows = d ? toRows(d.items, d.granularity) : []
  const s = d?.summary

  return (
    <>
      <Card className="mt-5 p-5">
        <SectionTitle
          title="Energy readings"
          caption="Usage per half hour is the difference between cumulative registers. Times are IST; a reading at 00:30 closes the 00:00–00:30 interval."
          action={<Segmented value={granularity} onChange={setGranularity} options={[{ value: 'raw', label: 'Half-hourly' }, { value: 'hour', label: 'Hourly' }, { value: 'day', label: 'Daily' }]} />}
        />
        <div className="mt-4">
          <WindowPicker value={window} onChange={setWindow} />
        </div>

        {readings.error ? (
          <ErrorState className="mt-4" error={readings.error} onRetry={readings.reload} />
        ) : !d || !s ? (
          <Loading />
        ) : (
          <div className={readings.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
              <Field label="Energy used">{nf(s.totalKwh, 2)} kWh</Field>
              <Field label="Apparent energy">{nf(s.totalKvah, 2)} kVAh</Field>
              <Field label="Power factor">{nf(s.powerFactor, 3)}</Field>
              <Field label="Voltage (R)">{s.voltageR ? `${nf(s.voltageR.min, 0)}–${nf(s.voltageR.max, 0)} V` : '—'}</Field>
              <Field label="Peak half hour">{s.peak ? `${nf(s.peak.kwh, 2)} kWh · ${dateTime(s.peak.intervalStart)}` : '—'}</Field>
              <Field label="Completeness">
                {s.intervals}/{s.expectedIntervals} half hours
              </Field>
            </div>

            <div className="mt-6 h-64">
              <ResponsiveContainer>
                <ComposedChart data={rows} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="t" tickFormatter={(t) => shortTime(t, d.granularity)} tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: CHART.tick }} label={{ value: 'kWh', angle: -90, position: 'insideLeft', offset: 20, fontSize: 10, fill: CHART.tick }} />
                  <Tooltip {...TOOLTIP} labelFormatter={(t) => dateTime(String(t))} formatter={(v, n) => [v === null ? 'no data' : nf(Number(v), 3), n === 'kwh' ? 'kWh' : String(n)]} />
                  <Bar dataKey="kwh" fill="url(#kwhFill)" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 h-40">
              <ResponsiveContainer>
                <LineChart data={rows} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="t" tickFormatter={(t) => shortTime(t, d.granularity)} tick={{ fontSize: 10, fill: CHART.tick }} minTickGap={24} />
                  <YAxis domain={[200, 260]} tick={{ fontSize: 10, fill: CHART.tick }} label={{ value: 'Volts', angle: -90, position: 'insideLeft', offset: 20, fontSize: 10, fill: CHART.tick }} />
                  <ReferenceLine y={216.2} stroke={CHART.danger} strokeDasharray="4 4" />
                  <ReferenceLine y={243.8} stroke={CHART.danger} strokeDasharray="4 4" />
                  <Tooltip {...TOOLTIP} labelFormatter={(t) => dateTime(String(t))} formatter={(v, n) => [`${nf(Number(v), 1)} V`, n === 'vAvg' ? 'Voltage' : n === 'vMin' ? 'Min' : 'Max']} />
                  {d.granularity !== 'raw' && <Line dataKey="vMin" stroke={CHART.muted} dot={false} strokeWidth={1} isAnimationActive={false} />}
                  {d.granularity !== 'raw' && <Line dataKey="vMax" stroke={CHART.muted} dot={false} strokeWidth={1} isAnimationActive={false} />}
                  <Line dataKey="vAvg" stroke={CHART.sky} dot={false} strokeWidth={1.8} isAnimationActive={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-[10px] text-subtle">Voltage (R phase). Dashed lines: 230 V ± 6% limits{d.granularity !== 'raw' && '; thin lines: min and max in each bucket'}.</p>

            {d.issues.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <div className="font-semibold">Reading issues in this window</div>
                <ul className="mt-1 list-disc pl-5">
                  {d.issues.slice(0, 8).map((i, n) => (
                    <li key={n}>
                      {i.message}
                      {i.at && <span className="text-amber-300"> · {dateTime(i.at)}</span>}
                    </li>
                  ))}
                  {d.issues.length > 8 && <li>… and {d.issues.length - 8} more</li>}
                </ul>
              </div>
            )}
            <p className="mt-3 text-[11px] text-subtle">
              Window {dateTime(d.window.from)} → {dateTime(d.window.to)} · newest reading {dateTime(readings.data?.meta.latestReadingAt)} · cache {readings.data?.meta.cache}
              {readings.data?.meta.stale && ' · stale copy (portal unavailable)'}
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-5 p-5">
        <SectionTitle title="Anomalies" caption="Rule-based checks on the same window: voltage, power factor, zero use, spikes, decommissioned-but-consuming, gaps." />
        <div className="mt-3">{anomalies.error ? <ErrorState error={anomalies.error} onRetry={anomalies.reload} /> : !anomalies.data ? <Loading /> : <AnomalyList anomalies={anomalies.data.data.anomalies} />}</div>
      </Card>
    </>
  )
}
