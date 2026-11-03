/**
 * Typed client for urja-api. Every call goes through this app's own proxy
 * (/api/urja/...), which adds the API key on the server.
 */
import type {
  AnomalyScan, GeoCollection, Hierarchy, HierarchyNode, MeterAnomalies, MeterDetail, MeterList, Nearby, Problem,
  Quality, Readings, Ready, SearchResult, Stats, TransformerDetail, TransformerList, TransformerLoad,
} from './types'

const PREFIX = '/api/urja'

/** A failed call, carrying the API's problem+json body. */
export class ApiError extends Error {
  readonly problem: Problem
  readonly retryAfterSeconds: number | null
  constructor(problem: Problem, retryAfterSeconds: number | null) {
    super(problem.detail ?? problem.title)
    this.problem = problem
    this.retryAfterSeconds = retryAfterSeconds
  }
  get status(): number {
    return this.problem.status
  }
}

export type Query = Record<string, string | number | boolean | undefined | null | string[]>

/** Builds `?a=1&b=x,y`, dropping empty values. */
export function toQuery(query: Query = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

export async function get<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${PREFIX}${path}${toQuery(query)}`, { headers: { accept: 'application/json' }, signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({ title: 'Network error', status: 0, code: 'network_error', detail: 'Could not reach this web app’s server.' }, null)
  }
  if (!response.ok) {
    let problem: Problem = { title: response.statusText || 'Request failed', status: response.status, code: 'http_error' }
    try {
      problem = { ...problem, ...((await response.json()) as Partial<Problem>) }
    } catch {
      // not JSON: keep the status line
    }
    const retry = Number(response.headers.get('retry-after'))
    throw new ApiError(problem, Number.isFinite(retry) && retry > 0 ? retry : null)
  }
  return (await response.json()) as T
}

const id = (value: string) => encodeURIComponent(value)

/** One function per API route. */
export const api = {
  ready: (s?: AbortSignal) => get<Ready>('/ready', undefined, s),
  stats: (groupBy?: string, s?: AbortSignal) => get<Stats>('/v1/stats', { groupBy }, s),
  quality: (s?: AbortSignal) => get<Quality>('/v1/quality', undefined, s),
  meters: (q: Query, s?: AbortSignal) => get<MeterList>('/v1/meters', q, s),
  metersGeo: (q: Query, s?: AbortSignal) => get<GeoCollection>('/v1/meters.geojson', q, s),
  meter: (meterId: string, s?: AbortSignal) => get<MeterDetail>(`/v1/meters/${id(meterId)}`, undefined, s),
  readings: (meterId: string, q: Query, s?: AbortSignal) => get<Readings>(`/v1/meters/${id(meterId)}/readings`, q, s),
  meterAnomalies: (meterId: string, q: Query, s?: AbortSignal) => get<MeterAnomalies>(`/v1/meters/${id(meterId)}/anomalies`, q, s),
  nearby: (q: Query, s?: AbortSignal) => get<Nearby>('/v1/meters/nearby', q, s),
  anomalies: (q: Query, s?: AbortSignal) => get<AnomalyScan>('/v1/anomalies', q, s),
  transformers: (q: Query, s?: AbortSignal) => get<TransformerList>('/v1/transformers', q, s),
  transformer: (code: string, s?: AbortSignal) => get<TransformerDetail>(`/v1/transformers/${id(code)}`, undefined, s),
  transformerLoad: (code: string, q: Query, s?: AbortSignal) => get<TransformerLoad>(`/v1/transformers/${id(code)}/load`, q, s),
  hierarchy: (q: Query, s?: AbortSignal) => get<Hierarchy>('/v1/hierarchy', q, s),
  node: (nodeId: string, q: Query, s?: AbortSignal) => get<HierarchyNode>(`/v1/hierarchy/${id(nodeId)}`, q, s),
  search: (q: string, s?: AbortSignal) => get<SearchResult>('/v1/search', { q, limit: 6 }, s),
}
