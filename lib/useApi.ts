'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ApiState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => void
}

/**
 * Runs `load` whenever `key` changes, cancels the previous request, and keeps
 * the last good data while a new request is loading (no flicker on filter
 * changes). `key === null` means "do not load yet".
 */
export function useApi<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(key !== null)
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    if (key === null) {
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(undefined)
    loadRef
      .current(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value)
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [key, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, error, loading, reload }
}
