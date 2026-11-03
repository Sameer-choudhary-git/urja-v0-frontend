'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MousePointerClick, X } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf, STATUS_COLOR } from '@/lib/format'
import { useApi } from '@/lib/useApi'
import { useUrlState } from '@/lib/useUrlState'
import { MapView, type MapPoint } from '@/components/MapView'
import { Card, Empty, ErrorState, Loading, PageHeader, SectionTitle, Select, StatusBadge } from '@/components/ui'

const RADII = ['250', '500', '1000', '2000', '5000', '10000']

export function MapPageView() {
  const router = useRouter()
  const url = useUrlState()
  const status = url.get('status')
  const lat = url.get('lat')
  const lng = url.get('lng')
  const radiusM = url.get('radiusM', '1000')
  const hasCenter = lat !== '' && lng !== ''

  const geo = useApi(`geo|${status}`, (s) => api.metersGeo({ status }, s))
  const nearbyQuery = { lat, lng, radiusM, status, limit: 50 }
  const nearby = useApi(hasCenter ? JSON.stringify(nearbyQuery) : null, (s) => api.nearby(nearbyQuery, s))

  const near = new Set(hasCenter ? nearby.data?.data.map((n) => n.meter.id) ?? [] : [])
  const points: MapPoint[] = (geo.data?.features ?? []).map((f) => ({
    id: f.id,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    color: STATUS_COLOR[f.properties.status] ?? '#94a3b8',
    label: `${f.id} · ${label(f.properties.status)} · ${f.properties.make} · ${f.properties.transformer}`,
    emphasis: near.has(f.id),
  }))
  const counts = (geo.data?.features ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.properties.status] = (acc[f.properties.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <PageHeader title="Map & nearby" caption="Every meter from /v1/meters.geojson. Click anywhere on the map to find meters within a radius (/v1/meters/nearby)." />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
            <Select label="Status" value={status} onChange={(v) => url.set({ status: v })} options={[{ value: '', label: 'All statuses' }, ...['installed', 'faulty', 'decommissioned'].map((s) => ({ value: s, label: label(s) }))]} />
            <Select label="Nearby radius" value={radiusM} onChange={(v) => url.set({ radiusM: v })} options={RADII.map((r) => ({ value: r, label: Number(r) >= 1000 ? `${Number(r) / 1000} km` : `${r} m` }))} />
            <div className="ml-auto flex flex-wrap gap-3 pb-2 text-[11px] text-muted">
              {Object.entries(counts).map(([s, n]) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} /> {label(s)} {n}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[560px]">
            {geo.error ? (
              <ErrorState className="m-4" error={geo.error} onRetry={geo.reload} />
            ) : !geo.data ? (
              <Loading text="Loading meters…" className="h-full" />
            ) : (
              <MapView
                points={points}
                zoom={10}
                fitToPoints
                circle={hasCenter ? { lat: Number(lat), lng: Number(lng), radiusM: Number(radiusM) } : undefined}
                onMapClick={(a, b) => url.set({ lat: a.toFixed(5), lng: b.toFixed(5) })}
                onPointClick={(id) => router.push(`/meters/${id}`)}
              />
            )}
          </div>
        </Card>

        <Card className="flex max-h-[640px] flex-col p-5">
          <SectionTitle
            title="Nearby meters"
            caption={hasCenter ? `Within ${nf(Number(radiusM))} m of ${lat}, ${lng}, nearest first` : undefined}
            action={hasCenter ? <button onClick={() => url.set({ lat: undefined, lng: undefined })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"><X size={13} /> Clear</button> : undefined}
          />
          <div className="mt-3 min-h-0 flex-1 overflow-auto">
            {!hasCenter ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-subtle">
                <MousePointerClick size={22} /> Click a spot on the map.
              </div>
            ) : nearby.error ? (
              <ErrorState error={nearby.error} onRetry={nearby.reload} />
            ) : !nearby.data ? (
              <Loading />
            ) : nearby.data.data.length === 0 ? (
              <Empty text="No meters in this radius. Try a larger one." />
            ) : (
              <ul className="divide-y divide-line-soft">
                {nearby.data.data.map(({ distanceM, meter }) => (
                  <li key={meter.id}>
                    <Link href={`/meters/${meter.id}`} className="flex items-center gap-3 py-2.5 hover:bg-hover">
                      <span className="w-16 shrink-0 text-right font-mono text-xs text-muted">{distanceM < 1000 ? `${nf(distanceM)} m` : `${nf(distanceM / 1000, 2)} km`}</span>
                      <span className="font-mono text-xs font-semibold text-brand">{meter.id}</span>
                      <span className="truncate text-[11px] text-subtle">{meter.network.transformer.code}</span>
                      <span className="ml-auto shrink-0"><StatusBadge status={meter.status} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
