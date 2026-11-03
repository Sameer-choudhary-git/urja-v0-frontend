'use client'

import Link from 'next/link'
import { AlertTriangle, CircleGauge, Database, Layers3, MapPin, ShieldCheck, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '@/lib/api'
import { CHART, TOOLTIP } from '@/lib/theme'
import { label, nf, STATUS_COLOR } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { Card, ErrorState, Freshness, Loading, SectionTitle, Stat } from '@/components/ui'

const entries = (record: Record<string, number>) =>
  Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

export function OverviewView() {
  const stats = useApi('stats', (s) => api.stats(undefined, s))
  const zones = useApi('stats-zone', (s) => api.stats('zone', s))

  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />
  if (!stats.data) return <Loading />
  const d = stats.data.data
  const status = ['installed', 'faulty', 'decommissioned', 'unknown'].map((name) => ({ name, value: d.byStatus[name] ?? 0 })).filter((x) => x.value > 0)
  const zoneData = zones.data?.data.groupedBy ? entries(zones.data.data.groupedBy.counts).sort((a, b) => a.name.localeCompare(b.name)) : []

  return (
    <>
      <Card className="relative mb-5 overflow-hidden p-6 md:p-8">
        <div className="grid-pattern pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-[11px] font-medium text-brand">
              <Zap size={12} fill="currentColor" /> Jaipur distribution network · live from urja-api
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              <span className="text-gradient">{nf(d.meters)} meters</span> <span className="text-ink">across {nf(d.transformers)} transformers</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Status, network, energy readings, transformer loading and data quality from the legacy Urja portal, cleaned up and served through one API.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Freshness meta={stats.data.meta} />
            <Link href="/anomalies?transformer=DT-007" className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-accent px-4 text-xs font-semibold text-canvas shadow-[0_0_24px_-6px_#2dd4bf] transition hover:brightness-110">
              <AlertTriangle size={14} /> Run an anomaly scan
            </Link>
            <Link href="/map" className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-panel-2 px-4 text-xs font-semibold text-ink hover:bg-hover">
              <MapPin size={14} /> Open the map
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Link href="/meters"><Stat label="Total meters" value={nf(d.meters)} hint="All registered meters" icon={<Database size={16} />} accent="#38bdf8" /></Link>
        <Link href="/meters?status=installed"><Stat label="Installed" value={nf(d.byStatus.installed)} hint={share(d.byStatus.installed, d.meters)} icon={<CircleGauge size={16} />} accent={STATUS_COLOR.installed} /></Link>
        <Link href="/meters?status=faulty"><Stat label="Faulty" value={nf(d.byStatus.faulty)} hint={share(d.byStatus.faulty, d.meters)} icon={<AlertTriangle size={16} />} accent={STATUS_COLOR.faulty} /></Link>
        <Link href="/transformers"><Stat label="Transformers" value={nf(d.transformers)} hint={`${nf(d.totalCapacityKva)} kVA rated in total`} icon={<Layers3 size={16} />} accent="#818cf8" /></Link>
        <Link href="/quality"><Stat label="Records with issues" value={nf(d.metersWithIssues)} hint="Repaired or conflicting portal data" icon={<ShieldCheck size={16} />} accent="#fbbf24" /></Link>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <SectionTitle title="Meter status" caption="Click a status to list those meters" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-8">
            <div className="h-52 w-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={status} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} strokeWidth={0}>
                    {status.map((x) => <Cell key={x.name} fill={STATUS_COLOR[x.name]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP} formatter={(v, n) => [nf(Number(v)), label(String(n))]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {status.map((x) => (
                <Link key={x.name} href={`/meters?status=${x.name}`} className="block rounded-lg px-2 py-1 hover:bg-hover">
                  <div className="flex items-center gap-2 text-xs text-ink-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[x.name] }} />
                    {label(x.name)}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <strong className="text-xl text-ink">{nf(x.value)}</strong>
                    <span className="text-[11px] text-subtle">{share(x.value, d.meters)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Meters by zone" caption={<>From <code>/v1/stats?groupBy=zone</code>. Open the <Link className="text-brand hover:underline" href="/network">network tree</Link> for the full hierarchy.</>} />
          <div className="mt-4 h-56">
            {zones.error ? <ErrorState error={zones.error} /> : (
              <ResponsiveContainer>
                <BarChart data={zoneData} layout="vertical" margin={{ left: 4, right: 16 }}>
                  <defs>
                    <linearGradient id="zoneFill" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART.brand} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART.brand} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} stroke={CHART.grid} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: CHART.tick }} />
                  <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 11, fill: CHART.label }} />
                  <Tooltip cursor={{ fill: CHART.cursor }} {...TOOLTIP} formatter={(v) => [nf(Number(v)), 'Meters']} />
                  <Bar dataKey="value" fill="url(#zoneFill)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Manufacturers" caption="Meters per make" />
          <div className="mt-4 h-56">
            <ResponsiveContainer>
              <BarChart data={entries(d.byMake)} margin={{ left: -18, right: 6 }}>
                <defs>
                  <linearGradient id="makeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.accent} />
                    <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART.label }} />
                <YAxis tick={{ fontSize: 10, fill: CHART.tick }} />
                <Tooltip cursor={{ fill: CHART.cursor }} {...TOOLTIP} formatter={(v) => [nf(Number(v)), 'Meters']} />
                <Bar dataKey="value" fill="url(#makeFill)" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Configuration" caption="Phase, installation type and portal build" />
          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <Bars title="Phase" record={d.byPhase} total={d.meters} param="phase" />
            <Bars title="Installation" record={d.byInstallationType} total={d.meters} param="installationType" />
            <Bars title="Build" record={d.byBuild} total={d.meters} param="build" />
          </div>
          <p className="mt-5 flex items-start gap-2 rounded-lg bg-panel-2 p-3 text-[11px] leading-relaxed text-muted">
            <Zap size={13} className="mt-0.5 shrink-0 text-brand" />
            Energy history on the portal covers 1–30 June 2026, so readings, anomalies and transformer load use June dates.
          </p>
        </Card>
      </div>
    </>
  )
}

function Bars({ title, record, total, param }: { title: string; record: Record<string, number>; total: number; param: string }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-muted">{title}</p>
      {entries(record).map((x) => (
        <Link key={x.name} href={`/meters?${param}=${x.name}`} className="mb-3 block">
          <div className="flex justify-between text-xs">
            <span className="text-ink-2">{label(x.name)}</span>
            <b>{nf(x.value)}</b>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-track">
            <div className="h-2 rounded-full bg-gradient-to-r from-brand to-accent" style={{ width: `${total ? (x.value / total) * 100 : 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  )
}

const share = (value: number | undefined, total: number) => (total ? `${Math.round(((value ?? 0) / total) * 100)}% of all meters` : '')
