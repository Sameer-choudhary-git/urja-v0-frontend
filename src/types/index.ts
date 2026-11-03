export type MeterStatus = 'installed' | 'faulty' | 'decommissioned' | 'unknown' | 'Installed' | 'Faulty' | 'Decommissioned'
export type PhaseType = 'single' | 'three'
export type InstallType = 'CT Operated' | 'Whole Current'

export interface HierarchyNode { name: string; code: string; id?: string; statusCounts?: Record<string, number> }
export interface MeterHierarchy { zone: HierarchyNode; circle: HierarchyNode; division: HierarchyNode; subdivision: HierarchyNode; substation: HierarchyNode; feeder: HierarchyNode; dt: HierarchyNode }
export interface MeterIssue { code: string; message?: string }
export interface Meter { meterId: string; serialNo: string; make: string; phaseType: PhaseType; installStatus: MeterStatus; installType: InstallType; build: string; dtCode: string; hierarchy: MeterHierarchy; geo?: { lat: number; lng: number }; issues?: MeterIssue[] }
export interface EnergyReading { timestamp: string; kwh?: number; kwhRegister?: number; intervalKwh?: number; kvah?: number; voltR?: number; powerFactor?: number; complete?: boolean; issues?: MeterIssue[] }
export interface Transformer { code: string; name: string; aliases?: string[]; feederCode?: string; capacityKva?: number; meterCount?: number }
export interface ApiMeta { asOf?: string; ageSeconds?: number; stale?: boolean; source?: string }
export interface ApiProblem { type?: string; title?: string; status?: number; code?: string; detail?: string; requestId?: string; errors?: { field: string; message: string }[] }
