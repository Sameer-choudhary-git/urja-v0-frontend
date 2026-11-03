'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, ChevronRight, Crosshair } from 'lucide-react'
import { api } from '@/lib/api'
import { label, nf, STATUS_COLOR } from '@/lib/format'
import { NETWORK_LEVELS } from '@/lib/types'
import { useApi } from '@/lib/useApi'
import { MapView } from '@/components/MapView'
import { ReadingsPanel } from '@/components/ReadingsPanel'
import { Card, ErrorState, Field, Loading, PageHeader, SectionTitle, StatusBadge, TextLink } from '@/components/ui'

export function MeterView({ meterId }: { meterId: string }) {
  const { data, error, reload } = useApi(meterId, (s) => api.meter(meterId, s))

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorState error={error} onRetry={reload} />
      </>
    )
  }
  if (!data) return <Loading />
  const m = data.data
  const codes = m.network.path.split('.')

  return (
    <>
      <BackLink />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{m.id}</span>
            <span className="rounded-full border border-line bg-panel px-3 py-1 text-sm font-medium">
              <StatusBadge status={m.status} />
            </span>
          </span>
        }
        caption={`${m.make} · ${label(m.phase)} · ${label(m.installationType)}`}
        meta={data.meta}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Meter" caption="Identity and installation, as normalised from the portal" />
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Meter ID"><span className="font-mono">{m.id}</span></Field>
            <Field label="Serial number"><span className="font-mono">{m.serialNumber}</span></Field>
            <Field label="Manufacturer">{m.make}</Field>
            <Field label="Status"><StatusBadge status={m.status} /></Field>
            <Field label="Phase">{label(m.phase)}</Field>
            <Field label="Installation">{label(m.installationType)}</Field>
            <Field label="Portal build">{m.build}</Field>
            <Field label="Coordinates">
              <span className="font-mono text-xs">
                {m.location.lat.toFixed(5)}, {m.location.lng.toFixed(5)}
              </span>
            </Field>
          </div>
          {m.issues.length > 0 && (
            <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle size={14} /> Data issues in the portal record
              </div>
              <ul className="mt-1 list-disc pl-5">
                {m.issues.map((i) => (
                  <li key={i.code + i.field}>
                    <b>{label(i.code)}</b> ({i.field}): {i.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="h-[300px]">
            <MapView points={[{ id: m.id, lat: m.location.lat, lng: m.location.lng, color: STATUS_COLOR[m.status] ?? '#94a3b8', label: m.id, emphasis: true }]} zoom={14} />
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <div className="text-xs text-muted">Location from the portal export</div>
            <Link href={`/map?lat=${m.location.lat.toFixed(5)}&lng=${m.location.lng.toFixed(5)}&radiusM=1000`} className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
              <Crosshair size={13} /> Meters nearby
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <SectionTitle title="Network position" caption="Zone down to distribution transformer. Click a level to open it." />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {NETWORK_LEVELS.map((level, i) => {
            const ref = m.network[level]
            const href = level === 'transformer' ? `/transformers/${ref.code}` : `/network/${codes.slice(0, i + 1).join('.')}`
            return (
              <div key={level} className="flex items-center gap-2">
                {i > 0 && <ChevronRight size={14} className="text-faint" />}
                <Link href={href} className="rounded-lg border border-line bg-panel-2 px-3 py-2 hover:border-brand/40 hover:bg-brand-soft">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label(level)}</div>
                  <div className="mt-0.5 text-xs font-semibold text-ink">{ref.name || '—'}</div>
                  <div className="font-mono text-[10px] text-brand">{ref.code || '—'}</div>
                </Link>
              </div>
            )
          })}
        </div>
        {m.transformer && (
          <p className="mt-4 text-xs text-muted">
            Transformer <TextLink href={`/transformers/${m.transformer.code}`}>{m.transformer.code}</TextLink> is rated {nf(m.transformer.capacityKva)} kVA and feeds {m.transformer.meterCount} meters.
            {m.transformer.aliases.length > 0 && <> The portal also calls it “{m.transformer.aliases.join('”, “')}”.</>}
          </p>
        )}
      </Card>

      <ReadingsPanel meterId={m.id} />
    </>
  )
}

function BackLink() {
  return (
    <Link href="/meters" className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline">
      <ArrowLeft size={13} /> All meters
    </Link>
  )
}
