import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-2 text-sm text-muted">That page does not exist.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Back to the overview</Link>
    </div>
  )
}
