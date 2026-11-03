import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loading } from '@/components/ui'
import { AnomaliesView } from './view'

export const metadata: Metadata = { title: 'Anomalies' }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <AnomaliesView />
    </Suspense>
  )
}
