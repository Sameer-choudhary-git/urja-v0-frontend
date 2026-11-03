import type { Metadata, Viewport } from 'next'
import { Shell } from '@/components/Shell'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Urja Insights', template: '%s · Urja Insights' },
  description: 'Meters, energy readings, network, transformers, anomalies and data quality from urja-api.',
}
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#070b14' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}
