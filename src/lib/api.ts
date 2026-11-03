import type { ApiMeta, ApiProblem, EnergyReading, Meter, Transformer } from '@/src/types'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://15.252.70.41'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || process.env.VITE_API_KEY
export class ApiError extends Error { problem: ApiProblem; constructor(problem: ApiProblem) { super(problem.detail || problem.title || 'API request failed'); this.problem = problem } }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  if (API_KEY && path.startsWith('/v1')) headers.set('X-API-Key', API_KEY)
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' })
  if (!response.ok) { let problem: ApiProblem = { status: response.status, title: response.statusText }; try { problem = await response.json() } catch {} throw new ApiError(problem) }
  return response.json()
}
const unwrap = <T,>(result: T | { data?: T }) => (result && typeof result === 'object' && 'data' in result && (result as { data?: T }).data ? (result as { data: T }).data : result as T)
export const api = {
  ready: () => request<{ status: string; meta?: ApiMeta }>('/ready'),
  getStats: (groupBy?: string) => request<{ data: unknown; meta?: ApiMeta }>(`/v1/stats${groupBy ? `?groupBy=${groupBy}` : ''}`),
  getQuality: () => request<{ data: unknown; meta?: ApiMeta }>('/v1/quality'),
  getMeters: (params = '') => request<{ data?: Meter[]; items?: Meter[]; total?: number; page?: { total: number; limit: number; offset: number }; facets?: Record<string, unknown>; meta?: ApiMeta } | Meter[]>(`/v1/meters${params}`),
  getMeter: (id: string) => request<Meter>(`/v1/meters/${encodeURIComponent(id)}`),
  getEnergy: (id: string, params = '?from=2026-06-24&to=2026-06-30&granularity=raw') => request<{ data: EnergyReading[]; meta?: ApiMeta } | EnergyReading[]>(`/v1/meters/${encodeURIComponent(id)}/readings${params}`),
  getTransformers: () => request<{ data?: Transformer[]; items?: Transformer[] } | Transformer[]>('/v1/transformers'),
  getGeoJson: (params = '') => request<{ type: 'FeatureCollection'; features: unknown[] }>(`/v1/meters.geojson${params}`),
  getAnomalies: (scope: string) => request<{ data?: unknown[]; failed?: unknown[] }>(`/v1/anomalies?${scope}`),
  getSearch: (q: string) => request<{ data?: unknown[] }>(`/v1/search?q=${encodeURIComponent(q)}`),
  unwrap,
}
