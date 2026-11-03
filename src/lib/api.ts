import type { EnergyReading, Meter, Transformer } from '@/src/types'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000'

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error(`API request failed (${response.status})`)
  return response.json()
}

export const api = {
  getMeters: (params = '') => request<{ data?: Meter[]; items?: Meter[]; total?: number } | Meter[]>(`/api/meters${params}`),
  getMeter: (id: string) => request<Meter>(`/api/meters/${encodeURIComponent(id)}`),
  getEnergy: (id: string) => request<{ data: EnergyReading[] } | EnergyReading[]>(`/api/meters/${encodeURIComponent(id)}/energy`),
  getTransformers: () => request<{ data?: Transformer[]; items?: Transformer[] } | Transformer[]>('/api/transformers'),
}
