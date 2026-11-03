'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Gauge, Grid2X2, Layers3, MapPin, Menu, Network, Search, ShieldCheck, X, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { label } from '@/lib/format'
import type { Ready, SearchResult } from '@/lib/types'
import { StatusBadge } from './ui'

const NAV = [
  { href: '/', label: 'Overview', icon: Grid2X2 },
  { href: '/meters', label: 'Meters', icon: Gauge },
  { href: '/map', label: 'Map & nearby', icon: MapPin },
  { href: '/network', label: 'Network', icon: Network },
  { href: '/transformers', label: 'Transformers', icon: Layers3 },
  { href: '/anomalies', label: 'Anomalies', icon: AlertTriangle },
  { href: '/quality', label: 'Data quality', icon: ShieldCheck },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-screen text-ink">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col border-r border-line bg-panel/80 px-4 py-5 backdrop-blur-xl transition-transform md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-accent text-canvas shadow-[0_0_24px_-4px_#2dd4bf]">
            <Zap size={19} fill="currentColor" />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight text-ink">Urja Insights</div>
            <div className="text-[10px] font-medium uppercase tracking-[.18em] text-subtle">Meter operations</div>
          </div>
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV.map(({ href, label: text, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link key={href} href={href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition', active ? 'bg-gradient-to-r from-brand/20 to-transparent text-ink shadow-[inset_2px_0_0_#2dd4bf]' : 'text-muted hover:bg-hover hover:text-ink')}>
                <Icon size={17} strokeWidth={1.8} className={active ? 'text-brand' : ''} />
                {text}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto rounded-lg border border-line bg-panel-2 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck size={15} className="text-brand" /> Read-only
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">Data comes from urja-api, a clean API over the legacy Urja portal. Times are IST.</p>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <div className="md:pl-[240px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/70 px-4 backdrop-blur-xl md:px-8">
          <button onClick={() => setOpen(!open)} className="md:hidden" aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <GlobalSearch />
          <ApiStatus />
        </header>
        <main className="mx-auto max-w-[1500px] p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

/** Polls /ready: catalog loaded? circuit breaker state? */
function ApiStatus() {
  const [ready, setReady] = useState<Ready | null>(null)
  const [down, setDown] = useState(false)
  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const r = await api.ready()
        if (alive) {
          setReady(r)
          setDown(false)
        }
      } catch (error) {
        if (!alive) return
        // /ready answers 503 with a body while the catalog is loading
        const body = (error as { problem?: unknown }).problem as Partial<Ready> | undefined
        setReady(body && 'catalog' in body ? (body as Ready) : null)
        setDown(true)
      }
    }
    void check()
    const timer = setInterval(check, 60_000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const circuit = ready?.portal?.circuit
  const ok = !down && ready?.ready && circuit === 'closed'
  const text = !ready && !down ? 'Checking API…' : down && !ready ? 'API unreachable' : !ready?.ready ? 'Loading catalog' : circuit && circuit !== 'closed' ? 'Portal degraded' : 'API connected'
  const title = ready ? `Catalog: ${ready.catalog.meterCount} meters · portal circuit: ${circuit ?? 'n/a'}${ready.catalog.lastError ? ` · last error: ${ready.catalog.lastError.message}` : ''}` : undefined
  return (
    <span title={title} className={cn('hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium sm:flex', ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_16px_-6px_#34d399]' : 'border-amber-500/30 bg-amber-500/10 text-amber-300')}>
      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', ok && 'animate-pulse')} />
      {text}
    </span>
  )
}

/** Searches meters, transformers and network nodes as you type (/v1/search). */
function GlobalSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [result, setResult] = useState<SearchResult['data'] | null>(null)
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) {
      setResult(null)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      api.search(text, controller.signal).then((r) => setResult(r.data)).catch(() => undefined)
    }, 200)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    setQ('')
    router.push(href)
  }
  const empty = result && !result.meters.length && !result.transformers.length && !result.nodes.length

  return (
    <div ref={box} className="relative w-full max-w-md">
      <Search size={15} className="absolute left-3 top-2.5 text-subtle" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && result?.meters[0]) go(`/meters/${result.meters[0].id}`)
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search meter, serial, transformer, network node…"
        className="h-9 w-full rounded-lg border border-line bg-panel-2/80 pl-9 pr-3 text-xs text-ink placeholder:text-subtle outline-none transition focus:border-brand focus:bg-panel focus:ring-2 focus:ring-brand/20"
      />
      {open && result && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 overflow-auto rounded-xl border border-line bg-panel p-2 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)]">
          {empty && <div className="p-3 text-xs text-subtle">No matches for “{q}”.</div>}
          {result.meters.length > 0 && <Group title="Meters" />}
          {result.meters.map((m) => (
            <Row key={m.id} onClick={() => go(`/meters/${m.id}`)}>
              <span className="font-mono text-xs font-semibold">{m.id}</span>
              <span className="text-xs text-subtle">{m.serialNumber}</span>
              <span className="ml-auto">
                <StatusBadge status={m.status} />
              </span>
            </Row>
          ))}
          {result.transformers.length > 0 && <Group title="Transformers" />}
          {result.transformers.map((t) => (
            <Row key={t.code} onClick={() => go(`/transformers/${t.code}`)}>
              <span className="font-mono text-xs font-semibold">{t.code}</span>
              <span className="text-xs text-ink-2">{t.name}</span>
              {t.aliases.length > 0 && <span className="text-[11px] text-subtle">aka {t.aliases.join(', ')}</span>}
            </Row>
          ))}
          {result.nodes.length > 0 && <Group title="Network" />}
          {result.nodes.map((n) => (
            <Row key={n.id} onClick={() => go(`/network/${n.id}`)}>
              <span className="text-[10px] font-semibold uppercase text-subtle">{label(n.level)}</span>
              <span className="text-xs text-ink">{n.name}</span>
              <span className="ml-auto font-mono text-[10px] text-subtle">{n.id}</span>
            </Row>
          ))}
        </div>
      )}
    </div>
  )
}

const Group = ({ title }: { title: string }) => <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-subtle">{title}</div>
const Row = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-hover">
    {children}
  </button>
)
