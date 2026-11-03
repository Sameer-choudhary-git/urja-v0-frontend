/**
 * Backend-for-frontend proxy: the browser calls /api/urja/v1/..., this server
 * adds the API key and forwards the request to urja-api.
 *
 * Why a proxy instead of calling the API from the browser:
 * - the API key stays on the server (a NEXT_PUBLIC_ key would ship in the JS bundle);
 * - no CORS setup on the API, and no mixed-content block when this site is on
 *   https (Vercel) and the API on plain http (EC2).
 *
 * Only GET, and only the API's read routes, are forwarded.
 */
import type { NextRequest } from 'next/server'

const BASE_URL = (process.env.URJA_API_BASE_URL ?? 'http://15.252.70.41').replace(/\/+$/, '')
const API_KEY = process.env.URJA_API_KEY ?? ''
const TIMEOUT_MS = 90_000 // an anomaly scan of 50 meters can take a while on a cold cache

const ALLOWED = /^(v1\/[A-Za-z0-9._\-/]+|v1\/meters\.geojson|ready|health)$/
const PASS_HEADERS = ['content-type', 'x-request-id', 'x-data-age', 'x-data-stale', 'x-data-source', 'x-cache', 'retry-after']

export const dynamic = 'force-dynamic'

function problem(status: number, code: string, title: string, detail: string): Response {
  return Response.json({ type: 'about:blank', title, status, code, detail }, { status, headers: { 'content-type': 'application/problem+json' } })
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params
  const target = path.join('/')
  if (!ALLOWED.test(target) || target.includes('..')) {
    return problem(404, 'not_found', 'Not found', `No proxied route for /${target}`)
  }

  const url = `${BASE_URL}/${target}${request.nextUrl.search}`
  const headers: Record<string, string> = { accept: 'application/json' }
  if (API_KEY) headers['x-api-key'] = API_KEY
  const requestId = request.headers.get('x-request-id')
  if (requestId) headers['x-request-id'] = requestId

  let upstream: Response
  try {
    upstream = await fetch(url, { headers, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError'
    return problem(
      timedOut ? 504 : 502,
      timedOut ? 'api_timeout' : 'api_unreachable',
      timedOut ? 'The API took too long' : 'The API is unreachable',
      timedOut ? `No answer from the API within ${TIMEOUT_MS / 1000} s` : `Could not reach the API at ${BASE_URL}`,
    )
  }

  const out = new Headers({ 'cache-control': 'no-store' })
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name)
    if (value !== null) out.set(name, value)
  }
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: out })
}
