import type { Metadata } from 'next'
import { QualityView } from './view'

export const metadata: Metadata = { title: 'Data quality' }

export default function Page() {
  return <QualityView />
}
