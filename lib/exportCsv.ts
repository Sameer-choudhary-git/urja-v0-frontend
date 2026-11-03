import { api, toQuery, type Query } from './api'
import { NETWORK_LEVELS, type Meter } from './types'

/**
 * Downloads every meter matching the current filters as CSV, for analysts who
 * want the data in Excel or a notebook. Pages through /v1/meters (500 per call).
 */
export async function downloadMetersCsv(filters: Query): Promise<number> {
  const rows: Meter[] = []
  for (let offset = 0; ; offset += 500) {
    const page = await api.meters({ ...filters, limit: 500, offset })
    rows.push(...page.data)
    if (rows.length >= page.page.total || page.data.length === 0) break
  }
  const header = [
    'id', 'serialNumber', 'make', 'phase', 'status', 'installationType', 'build', 'lat', 'lng',
    ...NETWORK_LEVELS.flatMap((l) => [`${l}Code`, `${l}Name`]), 'networkPath', 'issues',
  ]
  const cell = (v: unknown) => {
    const text = String(v ?? '')
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = rows.map((m) =>
    [
      m.id, m.serialNumber, m.make, m.phase, m.status, m.installationType, m.build, m.location.lat, m.location.lng,
      ...NETWORK_LEVELS.flatMap((l) => [m.network[l].code, m.network[l].name]), m.network.path,
      m.issues.map((i) => i.code).join(' '),
    ].map(cell).join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `urja-meters-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  return rows.length
}

/** Same filters as GeoJSON straight from the API (for QGIS, kepler.gl, Power BI maps). */
export const geoJsonUrl = (filters: Query) => `/api/urja/v1/meters.geojson${toQuery(filters)}`
