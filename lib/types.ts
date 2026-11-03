/**
 * Response types of urja-api, written to match its openapi.json
 * (components and responses). Field names are the API's, not the portal's.
 */

export type MeterStatus = 'installed' | 'faulty' | 'decommissioned' | 'unknown'
export type Phase = 'single' | 'three' | 'unknown'
export type InstallationType = 'whole_current' | 'ct_operated' | 'unknown'
export type NetworkLevel = 'zone' | 'circle' | 'division' | 'subdivision' | 'substation' | 'feeder' | 'transformer'
export type Severity = 'info' | 'warning' | 'critical'
export type Granularity = 'raw' | 'hour' | 'day'

export const NETWORK_LEVELS: NetworkLevel[] = ['zone', 'circle', 'division', 'subdivision', 'substation', 'feeder', 'transformer']

export interface Meta {
  asOf: string
  ageSeconds: number
  stale: boolean
  source: 'export' | 'fallback'
}

export interface Page {
  total: number
  limit: number
  offset: number
}

export interface NetworkRef {
  code: string
  name: string
}

export interface DataIssue {
  code: 'network_cell_repaired' | 'network_cell_missing' | 'transformer_name_conflict' | 'unknown_value'
  field: string
  detail: string
}

export interface Meter {
  id: string
  serialNumber: string
  make: string
  phase: Phase
  status: MeterStatus
  installationType: InstallationType
  build: string
  location: { lat: number; lng: number }
  network: Record<NetworkLevel, NetworkRef> & { path: string }
  issues: DataIssue[]
}

export interface Transformer {
  code: string
  name: string
  aliases: string[]
  capacityKva: number | null
  feederCode: string
  networkPath: string
  meterCount: number
}

export type MeterSummary = Pick<Meter, 'id' | 'serialNumber' | 'make' | 'phase' | 'status'>

export interface NodeSummary {
  id: string
  level: NetworkLevel
  code: string
  name: string
  meterCount: number
  statusCounts: Record<string, number>
}

export interface NodeTree extends NodeSummary {
  children?: NodeTree[]
}

export interface Ready {
  ready: boolean
  catalog: {
    loaded: boolean
    meterCount: number
    asOf: string | null
    ageSeconds: number | null
    refreshing: boolean
    lastError: { message: string; at: string } | null
  }
  portal: {
    circuit: 'closed' | 'open' | 'half_open'
    consecutiveFailures: number
    retryAfterSeconds: number | null
    activeRequests: number
    queuedRequests: number
  } | null
}

export interface MeterList {
  data: Meter[]
  page: Page
  facets: Record<string, Record<string, number>>
  meta: Meta
}

export interface MeterDetail {
  data: Meter & { transformer: Transformer | null }
  meta: Meta
}

export interface Nearby {
  data: { distanceM: number; meter: Meter }[]
  center: { lat: number; lng: number }
  radiusM: number
  meta: Meta
}

export interface GeoFeature {
  type: 'Feature'
  id: string
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { status: string; make: string; phase: string; transformer: string; hasIssues: boolean }
}

export interface GeoCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

export interface TransformerList {
  data: Transformer[]
  page: Page
  meta: Meta
}

export interface TransformerDetail {
  data: Transformer & { statusCounts: Record<string, number>; meters: MeterSummary[] }
  meta: Meta
}

export interface Hierarchy {
  data: NodeTree[]
  meta: Meta
}

export interface HierarchyNode {
  data: NodeSummary & {
    breadcrumb: Pick<NodeSummary, 'id' | 'level' | 'code' | 'name'>[]
    children: NodeSummary[]
    meters: Meter[]
    page: Page
  }
  meta: Meta
}

export interface SearchResult {
  data: {
    meters: Pick<Meter, 'id' | 'serialNumber' | 'status'>[]
    transformers: Pick<Transformer, 'code' | 'name' | 'aliases'>[]
    nodes: Pick<NodeSummary, 'id' | 'level' | 'code' | 'name'>[]
  }
  meta: Meta
}

export interface Stats {
  data: {
    meters: number
    transformers: number
    totalCapacityKva: number | null
    metersWithIssues: number
    byStatus: Record<string, number>
    byMake: Record<string, number>
    byPhase: Record<string, number>
    byInstallationType: Record<string, number>
    byBuild: Record<string, number>
    groupedBy: { field: string; counts: Record<string, number> } | null
  }
  meta: Meta
}

export interface Quality {
  data: {
    summary: { meters: number; metersWithIssues: number; issuesByCode: Record<string, number> }
    transformerNameConflicts: { code: string; canonicalName: string; aliases: string[] }[]
    scan: unknown
  }
  meta: Meta
}

export interface VoltageStats {
  min: number
  avg: number
  max: number
}

export interface RawReading {
  timestamp: string
  intervalStart: string
  kwhRegister: number
  kvahRegister: number
  voltageR: number
  intervalKwh: number | null
  intervalKvah: number | null
  powerFactor: number | null
}

export interface Bucket {
  start: string
  end: string
  kwh: number | null
  kvah: number | null
  powerFactor: number | null
  voltageR: VoltageStats | null
  intervals: number
  expectedIntervals: number
  complete: boolean
}

export interface ReadingIssue {
  code: string
  at: string | null
  message: string
}

export interface Readings {
  data: {
    meterId: string
    granularity: Granularity
    timezone: '+05:30'
    window: { from: string; to: string }
    summary: {
      intervals: number
      expectedIntervals: number
      totalKwh: number | null
      totalKvah: number | null
      powerFactor: number | null
      voltageR: VoltageStats | null
      peak: { intervalStart: string; kwh: number } | null
      firstReadingAt: string | null
      lastReadingAt: string | null
    }
    items: RawReading[] | Bucket[]
    issues: ReadingIssue[]
  }
  meta: {
    asOf: string
    ageSeconds: number
    stale: boolean
    cache: 'hit' | 'miss' | 'stale'
    maxAgeSeconds: number
    latestReadingAt: string | null
  }
}

export interface Anomaly {
  code: string
  severity: Severity
  subject: string
  at: string | null
  message: string
  value: number | null
}

export interface MeterAnomalies {
  data: { meterId: string; window: { from: string; to: string }; anomalies: Anomaly[] }
  meta: Meta
}

export interface AnomalyScan {
  data: {
    scope: string
    metersScanned: number
    failed: { meterId: string; error: string }[]
    counts: { bySeverity: Record<string, number>; byCode: Record<string, number> }
    anomalies: Anomaly[]
  }
  meta: Meta
}

export interface LoadPoint {
  intervalStart: string
  kva: number
  metersReporting: number
}

export interface TransformerLoad {
  data: {
    transformer: Transformer
    window: { from: string; to: string }
    capacityKva: number | null
    peak: LoadPoint | null
    peakUtilisationPercent: number | null
    averageKva: number | null
    metersReporting: number
    failed: { meterId: string; error: string }[]
    points: LoadPoint[]
    anomalies: Anomaly[]
  }
  meta: Meta
}

/** RFC 9457 problem details, as the API (and the proxy) send them. */
export interface Problem {
  type?: string
  title: string
  status: number
  code: string
  detail?: string
  requestId?: string
  errors?: { path: string; message: string }[]
}
