import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Loading } from '@/components/ui'
import { NodeView } from './view'

export async function generateMetadata({ params }: { params: Promise<{ nodeId: string }> }): Promise<Metadata> {
  const { nodeId } = await params
  return { title: decodeURIComponent(nodeId) }
}

export default async function Page({ params }: { params: Promise<{ nodeId: string }> }) {
  const { nodeId } = await params
  return (
    <Suspense fallback={<Loading />}>
      <NodeView nodeId={decodeURIComponent(nodeId)} />
    </Suspense>
  )
}
