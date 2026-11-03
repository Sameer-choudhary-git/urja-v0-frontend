import type { Metadata } from 'next'
import { MeterView } from './view'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Meter ${decodeURIComponent(id)}` }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MeterView meterId={decodeURIComponent(id)} />
}
