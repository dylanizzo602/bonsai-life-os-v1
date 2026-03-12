/* Calendar ICS proxy edge function: fetch external ICS feeds server-side and return them with CORS for the web app */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

/* Build CORS headers so the frontend app can call this function from any origin */
function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

/* Normalize an incoming calendar URL and restrict to safe schemes */
function normalizeTargetUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Allow and normalize webcal:// to https:// for common calendar providers
  let url = trimmed.replace(/^webcal:/i, 'https:')

  // Only allow http/https targets for safety
  if (!/^https?:\/\//i.test(url)) {
    return null
  }

  return url
}

/* Edge function handler: proxy ICS requests to avoid browser CORS and auth issues */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const body = await req.json().catch(() => ({} as { url?: string }))
    const targetParam = body.url
    if (!targetParam) {
      return new Response('Missing "url" in request body.', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const targetUrl = normalizeTargetUrl(targetParam)
    if (!targetUrl) {
      return new Response('Invalid calendar URL. Only http/https (and webcal) URLs are allowed.', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const upstreamResponse = await fetch(targetUrl)
    const upstreamStatus = upstreamResponse.status
    const upstreamBody = await upstreamResponse.text()

    // Always return 200 to the client so Supabase client libraries don't treat this as a hard error.
    // If the upstream failed, prefix the response with a comment line that our simple ICS parser will ignore.
    const icsText = upstreamStatus >= 200 && upstreamStatus < 300
      ? upstreamBody
      : `X-ERROR: Upstream calendar error ${upstreamStatus}\n${upstreamBody}`

    const headers = new Headers(corsHeaders)
    headers.set('Content-Type', 'text/calendar; charset=utf-8')

    return new Response(icsText, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error('Calendar ICS proxy error:', error)
    // On unexpected errors, still return 200 with a comment prefix so the frontend doesn't see a hard error.
    const icsText = `X-ERROR: Failed to fetch calendar ICS feed\n${(error as Error).message ?? ''}`
    return new Response(icsText, {
      status: 200,
      headers: corsHeaders,
    })
  }
})
