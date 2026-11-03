import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Urja Insights | Utility Operations', description: 'Enterprise electricity utility operations and smart meter analytics.' }
export const viewport: Viewport = { colorScheme: 'light', themeColor: '#f5f8f7' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
