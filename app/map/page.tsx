import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loading } from '@/components/ui'
import { MapPageView } from './view'

export const metadata: Metadata = { title: 'Map & nearby' }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MapPageView />
    </Suspense>
  )
}
