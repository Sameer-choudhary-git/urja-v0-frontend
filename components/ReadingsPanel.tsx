'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Download, Table2 } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, toQuery } from '@/lib/api'
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
  kvah: number | null
  pf: number | null
  vMin: number | null
  vAvg: number | null
  vMax: number | null
}

const toRows = (items: RawReading[] | Bucket[], granularity: Granularity): Row[] =>
  granularity === 'raw'
    ? (items as RawReading[]).map((r) => ({ t: r.intervalStart, kwh: r.intervalKwh, kvah: r.intervalKvah, pf: r.powerFactor, vMin: r.voltageR, vAvg: r.voltageR, vMax: r.voltageR }))
    : (items as Bucket[]).map((b) => ({ t: b.start, kwh: b.kwh, kvah: b.kvah, pf: b.powerFactor, vMin: b.voltageR?.min ?? null, vAvg: b.voltageR?.avg ?? null, vMax: b.voltageR?.max ?? null }))

const SERIES: Record<string, string> = { kwh: 'kWh (active)', kvah: 'kVAh (apparent)' }

export function ReadingsPanel({ meterId }: { meterId: string }) {
  const [window, setWindow] = useState<Window>({ from: '2026-06-24', to: '2026-06-30' })
  const [granularity, setGranularity] = useState<Granularity>('hour')
  const [picked, setPicked] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const q = { ...toApiWindow(window), granularity }
  const readings = useApi(`${meterId}|${JSON.stringify(q)}`, (s) => api.readings(meterId, q, s))
  const anomalies = useApi(`${meterId}|${window.from}|${window.to}`, (s) => api.meterAnomalies(meterId, toApiWindow(window), s))

  const d = readings.data?.data
  const rows = d ? toRows(d.items, d.granularity) : []
  const s = d?.summary
  // Some meters are read only once a day by the portal: hourly and half-hourly usage does not exist for them.
  const daily = (s?.readingIntervalMinutes ?? 30) >= 1440
  useEffect(() => {
    if (daily && !picked && granularity !== 'day') setGranularity('day')
  }, [daily, picked, granularity])
  const choose = (g: Granularity) => {
    setPicked(true)
    setGranularity(g)
  }
  const peakDay = daily ? rows.reduce<Row | null>((best, r) => (r.kwh !== null && (best === null || r.kwh > (best.kwh ?? 0)) ? r : best), null) : null
  const csvUrl = `/api/urja/v1/export/readings${toQuery({ meterIds: meterId, ...toApiWindow(window), granularity, format: 'csv' })}`

  return (
    <>
      <Card className="mt-5 p-5">
        <SectionTitle
          title="Energy readings"
          caption="Usage is the difference between cumulative kWh and kVAh registers. Times are IST; a reading closes the interval before it (00:30 closes 00:00–00:30)."
          action={<Segmented value={granularity} onChange={choose} options={[{ value: 'raw', label: 'Half-hourly' }, { value: 'hour', label: 'Hourly' }, { value: 'day', label: 'Daily' }]} />}
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
            {daily && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
                <CalendarDays size={14} />
                <span>
                  The portal reads this meter <b>once a day</b> (at 00:00), so usage is known per day only.
                  {granularity !== 'day' && ' Hourly and half-hourly usage does not exist for it.'}
                </span>
                {granularity !== 'day' && (
                  <button onClick={() => choose('day')} className="ml-auto rounded-md border border-sky-400/40 px-2 py-0.5 font-medium hover:bg-sky-500/20">
                    Show daily
                  </button>
                )}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 xl:grid-cols-6">
              <Field label="Energy used">{nf(s.totalKwh, 2)} kWh</Field>
              <Field label="Apparent energy">{nf(s.totalKvah, 2)} kVAh</Field>
              <Field label="Power factor">{nf(s.powerFactor, 3)}</Field>
              <Field label="Voltage (R)">{s.voltageR ? `${nf(s.voltageR.min, 0)}–${nf(s.voltageR.max, 0)} V` : '—'}</Field>
              {daily ? (
                <Field label="Peak day">{peakDay?.kwh != null ? `${nf(peakDay.kwh, 2)} kWh · ${shortTime(peakDay.t, 'day')}` : '—'}</Field>
              ) : (
                <Field label="Peak half hour">{s.peak ? `${nf(s.peak.kwh, 2)} kWh · ${dateTime(s.peak.intervalStart)}` : '—'}</Field>
              )}
              <Field label="Completeness">
                {daily ? `${nf(s.intervals / 48, 1)}/${nf(s.expectedIntervals / 48, 1)} days` : `${s.intervals}/${s.expectedIntervals} half hours`}
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
                  <YAxis tick={{ fontSize: 10, fill: CHART.tick }} label={{ value: 'kWh / kVAh', angle: -90, position: 'insideLeft', offset: 20, fontSize: 10, fill: CHART.tick }} />
                  <Tooltip {...TOOLTIP} labelFormatter={(t) => dateTime(String(t))} formatter={(v, n) => [v === null ? 'no data' : nf(Number(v), 3), SERIES[String(n)] ?? String(n)]} />
                  <Legend formatter={(n) => <span className="text-[11px] text-muted">{SERIES[String(n)] ?? n}</span>} iconSize={8} wrapperStyle={{ paddingTop: 4 }} />
                  <Bar dataKey="kwh" fill="url(#kwhFill)" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                  <Bar dataKey="kvah" fill={CHART.accent} fillOpacity={0.45} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
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

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={() => setShowTable((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 text-xs font-medium text-ink hover:bg-hover">
                <Table2 size={14} /> {showTable ? 'Hide' : 'Show'} readings table
              </button>
              <a href={csvUrl} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-3 text-xs font-medium text-ink hover:bg-hover">
                <Download size={14} /> CSV (/v1/export/readings)
              </a>
            </div>
            {showTable && <ReadingsTable items={d.items} granularity={d.granularity} />}

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

/** The numbers behind the charts, like the portal's table: registers (kWh, kVAh, V(R)) plus derived usage. */
function ReadingsTable({ items, granularity }: { items: RawReading[] | Bucket[]; granularity: Granularity }) {
  const th = 'sticky top-0 bg-panel-2 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-subtle'
  const td = 'px-3 py-1.5 tabular-nums'
  return (
    <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-line text-xs">
      <table className="w-full">
        <thead>
          {granularity === 'raw' ? (
            <tr>
              {['Timestamp', 'kWh register', 'kVAh register', 'V(R)', 'kWh used', 'kVAh used', 'PF', 'Interval'].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          ) : (
            <tr>
              {['Start', 'kWh', 'kVAh', 'PF', 'V min', 'V avg', 'V max', 'Half hours'].map((h) => <th key={h} className={th}>{h}</th>)}
            </tr>
          )}
        </thead>
        <tbody className="divide-y divide-line-soft">
          {granularity === 'raw'
            ? (items as RawReading[]).map((r) => (
                <tr key={r.timestamp} className="hover:bg-hover">
                  <td className={td}>{dateTime(r.timestamp)}</td>
                  <td className={td}>{nf(r.kwhRegister, 2)}</td>
                  <td className={td}>{nf(r.kvahRegister, 2)}</td>
                  <td className={td}>{r.voltageR}</td>
                  <td className={td}>{nf(r.intervalKwh, 2)}</td>
                  <td className={td}>{nf(r.intervalKvah, 2)}</td>
                  <td className={td}>{nf(r.powerFactor, 3)}</td>
                  <td className={`${td} text-subtle`}>{r.intervalMinutes >= 1440 ? `${r.intervalMinutes / 1440} d` : r.intervalMinutes >= 60 ? `${r.intervalMinutes / 60} h` : `${r.intervalMinutes} min`}</td>
                </tr>
              ))
            : (items as Bucket[]).map((b) => (
                <tr key={b.start} className="hover:bg-hover">
                  <td className={td}>{dateTime(b.start)}</td>
                  <td className={td}>{nf(b.kwh, 2)}</td>
                  <td className={td}>{nf(b.kvah, 2)}</td>
                  <td className={td}>{nf(b.powerFactor, 3)}</td>
                  <td className={td}>{nf(b.voltageR?.min, 0)}</td>
                  <td className={td}>{nf(b.voltageR?.avg, 1)}</td>
                  <td className={td}>{nf(b.voltageR?.max, 0)}</td>
                  <td className={`${td} ${b.complete ? 'text-subtle' : 'text-amber-300'}`}>{b.intervals}/{b.expectedIntervals}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
