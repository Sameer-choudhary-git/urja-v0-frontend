'use client'

import dynamic from 'next/dynamic'
import { Loading } from './ui'
import type { LeafletMapProps } from './LeafletMap'

export type { MapPoint } from './LeafletMap'

export const MapView = dynamic<LeafletMapProps>(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <Loading text="Loading map…" className="h-full" />,
})
