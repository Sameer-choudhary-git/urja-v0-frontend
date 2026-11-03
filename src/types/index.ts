export type MeterStatus = 'Installed' | 'Faulty' | 'Decommissioned'
export type PhaseType = 'single' | 'three'
export type InstallType = 'CT Operated' | 'Whole Current'

export interface HierarchyNode { name: string; code: string }
export interface MeterHierarchy { zone: HierarchyNode; circle: HierarchyNode; division: HierarchyNode; subdivision: HierarchyNode; substation: HierarchyNode; feeder: HierarchyNode; dt: HierarchyNode }
export interface Meter { meterId: string; serialNo: string; make: string; phaseType: PhaseType; installStatus: MeterStatus; installType: InstallType; build: string; dtCode: string; hierarchy: MeterHierarchy; geo?: { lat: number; lng: number } }
export interface EnergyReading { timestamp: string; kwh: number; kvah: number; voltR?: number }
export interface Transformer { code: string; name: string; feederCode?: string; capacityKva?: number; meterCount?: number }
