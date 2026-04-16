/* Google OAuth start edge function: build a Google consent URL for Calendar read-only access */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* Build CORS headers so the frontend app can call this function from any origin */
function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

/* Create a request-scoped Supabase client for validating the caller's JWT */
function getAuthedClient(req: Request) {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

/* Base64url encode helpers for compact state payloads */
function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value)
  return base64UrlEncode(new TextEncoder().encode(json))
}

/* HMAC-sign the payload to prevent tampering */
async function hmacSign(payloadB64: string): Promise<string> {
  const secret = Deno.env.get('GOOGLE_OAUTH_STATE_SECRET') ?? ''
  if (!secret) throw new Error('Missing GOOGLE_OAUTH_STATE_SECRET')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64)))
  return base64UrlEncode(sig)
}

/* Generate a cryptographically strong nonce for state (best-effort replay protection) */
function randomNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/* Edge function handler: returns an authorization URL the client can redirect to */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    /* Auth check: require an authenticated Supabase user */
    const supabase = getAuthedClient(req)
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* Request body: allow passing a return path after OAuth completes */
    const body = await req.json().catch(() => ({} as { returnTo?: string }))
    const returnTo = typeof body.returnTo === 'string' && body.returnTo.trim() ? body.returnTo.trim() : '/?section=settings'

    /* OAuth config: env vars for Google client + redirect URL (edge callback) */
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URL') ?? ''
    if (!clientId || !redirectUri) {
      return new Response(JSON.stringify({ error: 'missing_oauth_env' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* State payload: signed so callback can trust user id + return target */
    const payload = {
      userId: data.user.id,
      nonce: randomNonce(),
      returnTo,
      issuedAt: Date.now(),
    }
    const payloadB64 = base64UrlEncodeJson(payload)
    const sig = await hmacSign(payloadB64)
    const state = `${payloadB64}.${sig}`

    /* Consent URL: request offline access so we receive a refresh token */
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('include_granted_scopes', 'true')
    authUrl.searchParams.set('state', state)

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('google-oauth-start error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
