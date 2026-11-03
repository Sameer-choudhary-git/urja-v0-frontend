'use client'

import Link from 'next/link'
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, RefreshCw } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { age, label, SEVERITY_COLOR, STATUS_COLOR } from '@/lib/format'
import type { Meta } from '@/lib/types'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-2xl border border-line bg-panel/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.03),0_12px_32px_-16px_rgb(0_0_0/0.7)] backdrop-blur', className)}>
      {children}
    </section>
  )
}

export function SectionTitle({ title, caption, action }: { title: string; caption?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {caption && <p className="mt-1 text-xs text-muted">{caption}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ title, caption, meta, action }: { title: React.ReactNode; caption?: React.ReactNode; meta?: Meta; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink md:text-[28px]">{title}</h1>
        {caption && <p className="mt-1 text-sm text-muted">{caption}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {meta && <Freshness meta={meta} />}
        {action}
      </div>
    </div>
  )
}

/** Shows how old the catalog data is and which portal path it came from. */
export function Freshness({ meta }: { meta: Meta }) {
  return (
    <span
      title={`Fetched from the portal at ${new Date(meta.asOf).toLocaleString()} via the ${meta.source === 'export' ? 'signed export' : 'fallback pages'}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
        meta.stale ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-line bg-panel/70 text-muted',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.stale ? 'bg-amber-400' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]')} />
      Data {age(meta.ageSeconds)}
      {meta.stale && ' · stale'}
      {meta.source === 'fallback' && ' · fallback source'}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[status] ?? '#94a3b8', boxShadow: `0 0 8px ${STATUS_COLOR[status] ?? '#94a3b8'}` }} />
      {label(status)}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLOR[severity] ?? '#64748b'
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}>
      {label(severity)}
    </span>
  )
}

export function Stat({ label: text, value, hint, icon, accent = '#2dd4bf' }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; accent?: string }) {
  return (
    <Card className="group relative h-full overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-white/15">
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted">{text}</span>
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ color: accent, background: `${accent}1f` }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-subtle">{hint}</div>}
    </Card>
  )
}

export function Loading({ text = 'Loading…', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-12 text-sm text-subtle', className)}>
      <Loader2 size={16} className="animate-spin" /> {text}
    </div>
  )
}

export function Empty({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-subtle', className)}>
      <Inbox size={20} /> {text}
    </div>
  )
}

/** Turns any error into a readable panel; for API errors shows status, code and request id. */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const apiError = error instanceof ApiError ? error : null
  const status = apiError?.status
  const title =
    status === 503 ? 'The portal is unavailable right now'
    : status === 502 ? 'The portal answered with an error'
    : status === 404 ? 'Not found'
    : status === 400 ? 'The request was not valid'
    : status === 401 ? 'The web app is not authorised to call the API'
    : status === 429 ? 'Too many requests'
    : 'Something went wrong'
  const hint =
    status === 401 ? 'Set URJA_API_KEY on the web server to a key from the API’s API_KEYS.'
    : status === 503 && apiError?.retryAfterSeconds ? `Try again in about ${apiError.retryAfterSeconds} s. Cached data keeps working meanwhile.`
    : undefined
  return (
    <div className={cn('rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm', className)}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-red-200">{title}</div>
          <div className="mt-1 text-red-300">{apiError?.problem.detail ?? (error instanceof Error ? error.message : String(error))}</div>
          {apiError?.problem.errors && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-300">
              {apiError.problem.errors.map((e) => (
                <li key={e.path}>
                  <code>{e.path}</code>: {e.message}
                </li>
              ))}
            </ul>
          )}
          {hint && <div className="mt-2 text-xs text-red-300">{hint}</div>}
          {apiError && (
            <div className="mt-2 font-mono text-[10px] text-red-400/70">
              {apiError.status} {apiError.problem.code}
              {apiError.problem.requestId && ` · request ${apiError.problem.requestId}`}
            </div>
          )}
        </div>
        {onRetry && (
          <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 bg-panel px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20">
            <RefreshCw size={13} /> Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
  if (total <= limit) return <div className="px-4 py-3 text-xs text-muted">{total} result{total === 1 ? '' : 's'}</div>
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-muted">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1.5">
        <button disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40 enabled:hover:bg-hover" aria-label="Previous page">
          <ChevronLeft size={15} />
        </button>
        <button disabled={to >= total} onClick={() => onChange(offset + limit)} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40 enabled:hover:bg-hover" aria-label="Next page">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

export function Select({ value, onChange, options, label: text, className }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1 text-[11px] font-medium text-muted', className)}>
      {text}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function DateInput({ value, onChange, label: text, min, max }: { value: string; onChange: (value: string) => void; label: string; min?: string; max?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
      {text}
      <input type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-lg border border-line bg-panel px-2.5 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-panel-2 p-0.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition', value === o.value ? 'bg-panel text-brand shadow-sm' : 'text-muted hover:text-ink')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{text}</div>
      <div className="mt-1 text-sm font-medium text-ink">{children}</div>
    </div>
  )
}

export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('font-medium text-brand hover:underline', className)}>
      {children}
    </Link>
  )
}
