import type { Metadata } from 'next'
import { TransformerView } from './view'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  return { title: decodeURIComponent(code) }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <TransformerView code={decodeURIComponent(code)} />
}
