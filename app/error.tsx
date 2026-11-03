'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
      <div className="font-semibold">This page crashed.</div>
      <div className="mt-1">{error.message}</div>
      <button onClick={reset} className="mt-4 rounded-lg border border-red-500/30 bg-panel px-3 py-1.5 text-xs font-medium">Try again</button>
    </div>
  )
}
