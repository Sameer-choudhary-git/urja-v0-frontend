import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loading } from '@/components/ui'
import { MetersView } from './view'

export const metadata: Metadata = { title: 'Meters' }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <MetersView />
    </Suspense>
  )
}
