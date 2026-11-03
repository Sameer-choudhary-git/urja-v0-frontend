'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  color: string
  label: string
  emphasis?: boolean
}

export interface LeafletMapProps {
  points: MapPoint[]
  center?: { lat: number; lng: number }
  zoom?: number
  circle?: { lat: number; lng: number; radiusM: number }
  fitToPoints?: boolean
  onPointClick?: (id: string) => void
  onMapClick?: (lat: number, lng: number) => void
  className?: string
}

/** Leaflet only runs in the browser; load this through components/MapView (next/dynamic, ssr: false). */
export default function LeafletMap({ points, center, zoom = 11, circle, fitToPoints, onPointClick, onMapClick, className }: LeafletMapProps) {
  const start = center ?? (points[0] ? { lat: points[0].lat, lng: points[0].lng } : { lat: 26.9124, lng: 75.7873 })
  return (
    <MapContainer center={[start.lat, start.lng]} zoom={zoom} scrollWheelZoom className={className ?? 'h-full w-full'}>
      {/* Standard OpenStreetMap tiles (no API key needed), darkened with a CSS filter in globals.css (.map-dark). */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        className="map-dark"
      />
      {circle && <Circle center={[circle.lat, circle.lng]} radius={circle.radiusM} pathOptions={{ color: '#2dd4bf', weight: 1.5, fillColor: '#2dd4bf', fillOpacity: 0.08, dashArray: '4 4' }} />}
      {circle && <CircleMarker center={[circle.lat, circle.lng]} radius={5} pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2dd4bf', fillOpacity: 1 }} />}
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.emphasis ? 9 : 5}
          pathOptions={{ color: p.emphasis ? '#ffffff' : '#070b14', weight: p.emphasis ? 2 : 1, fillColor: p.color, fillOpacity: 0.9 }}
          eventHandlers={onPointClick ? { click: () => onPointClick(p.id) } : undefined}
        >
          <Tooltip>{p.label}</Tooltip>
        </CircleMarker>
      ))}
      {onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {fitToPoints && <FitBounds points={points} circle={circle} />}
    </MapContainer>
  )
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

function FitBounds({ points, circle }: { points: MapPoint[]; circle?: LeafletMapProps['circle'] }) {
  const map = useMap()
  const signature = points.length + (circle ? `${circle.lat},${circle.lng},${circle.radiusM}` : '')
  useEffect(() => {
    // With a nearby circle, frame the circle; otherwise frame all points.
    let coords: [number, number][] = points.map((p) => [p.lat, p.lng])
    if (circle) {
      const dLat = circle.radiusM / 111_320
      const dLng = dLat / Math.cos((circle.lat * Math.PI) / 180)
      coords = [[circle.lat - dLat, circle.lng - dLng], [circle.lat + dLat, circle.lng + dLng]]
    }
    if (coords.length < 2) return
    const fit = () => {
      map.invalidateSize()
      map.fitBounds(coords as LatLngBoundsExpression, { padding: [24, 24], maxZoom: 16, animate: false })
    }
    // The container can still be resizing when the map mounts (dynamic import, fonts, grid layout),
    // so fit now and again whenever its size changes, until the user pans or zooms by hand.
    let userMoved = false
    const container = map.getContainer()
    const stop = () => { userMoved = true }
    container.addEventListener('pointerdown', stop)
    container.addEventListener('wheel', stop, { passive: true })
    const observer = new ResizeObserver(() => { if (!userMoved) fit() })
    observer.observe(container)
    const timer = setTimeout(fit, 50)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      container.removeEventListener('pointerdown', stop)
      container.removeEventListener('wheel', stop)
    }
  }, [signature]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
