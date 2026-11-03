'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Filters live in the URL (?status=faulty&offset=25), so a filtered view can
 * be bookmarked, shared and survives a reload. Setting any key other than
 * `offset` resets paging.
 */
export function useUrlState() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params])

  const set = useCallback(
    (changes: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '' || value === 0 && key === 'offset') next.delete(key)
        else next.set(key, String(value))
      }
      if (!('offset' in changes)) next.delete('offset')
      const text = next.toString()
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false })
    },
    [params, router, pathname],
  )

  return { get, set, params }
}
