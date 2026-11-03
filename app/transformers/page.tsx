import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loading } from '@/components/ui'
import { TransformersView } from './view'

export const metadata: Metadata = { title: 'Transformers' }

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <TransformersView />
    </Suspense>
  )
}
