/* Google OAuth callback edge function: exchange code for tokens and store refresh token server-side */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* Base64url decode helper for state payloads */
function base64UrlDecodeToString(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '==='.slice((b64.length + 3) % 4)
  return atob(padded)
}

/* Base64url encode helper (used for signature compare) */
function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/* Verify the signed state and return the decoded payload */
async function verifyAndDecodeState(state: string): Promise<{ userId: string; returnTo?: string }> {
  const [payloadB64, sig] = state.split('.')
  if (!payloadB64 || !sig) throw new Error('Invalid state format')

  const secret = Deno.env.get('GOOGLE_OAUTH_STATE_SECRET') ?? ''
  if (!secret) throw new Error('Missing GOOGLE_OAUTH_STATE_SECRET')

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const expected = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64)),
  )
  const expectedB64 = base64UrlEncode(expected)
  if (expectedB64 !== sig) throw new Error('Invalid state signature')

  const json = base64UrlDecodeToString(payloadB64)
  const payload = JSON.parse(json) as { userId?: unknown; returnTo?: unknown }
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const returnTo = typeof payload.returnTo === 'string' ? payload.returnTo : undefined
  if (!userId) throw new Error('Invalid state payload')
  return { userId, returnTo }
}

/* Build a Supabase client using service role credentials for token storage */
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  /* Secrets: Supabase may block names containing "supabase"; prefer SERVICE_ROLE_KEY. */
  const key = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Exchange OAuth code for tokens using Google token endpoint */
async function exchangeCodeForTokens(params: {
  code: string
  redirectUri: string
}): Promise<{
  access_token?: string
  refresh_token?: string
  scope?: string
  token_type?: string
  expires_in?: number
}> {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth client credentials')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Google token exchange error:', res.status, json)
    throw new Error(`Google token exchange failed: ${res.status}`)
  }

  return json as any
}

/* Edge function handler: called by Google redirect_uri */
serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code') ?? ''
    const state = url.searchParams.get('state') ?? ''
    const errorParam = url.searchParams.get('error')

    /* Redirect base: required so callback can return users to the app */
    const appBase = Deno.env.get('APP_BASE_URL') ?? ''
    if (!appBase) return new Response('Missing APP_BASE_URL', { status: 500 })

    if (errorParam) {
      const to = new URL('/?section=settings', appBase)
      to.searchParams.set('google_calendar', 'error')
      to.searchParams.set('reason', errorParam)
      return Response.redirect(to.toString(), 302)
    }

    if (!code || !state) {
      const to = new URL('/?section=settings', appBase)
      to.searchParams.set('google_calendar', 'error')
      to.searchParams.set('reason', 'missing_code_or_state')
      return Response.redirect(to.toString(), 302)
    }

    /* Verify state to learn which user to store tokens for */
    const decoded = await verifyAndDecodeState(state)

    const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URL') ?? ''
    if (!redirectUri) throw new Error('Missing GOOGLE_OAUTH_REDIRECT_URL')

    /* Token exchange: obtain refresh token (may only be returned on first consent) */
    const tokens = await exchangeCodeForTokens({ code, redirectUri })

    const supabase = getServiceClient()

    /* Upsert: preserve existing refresh token if Google doesn't send it again */
    const { data: existing, error: existingErr } = await supabase
      .from('google_calendar_tokens')
      .select('refresh_token')
      .eq('user_id', decoded.userId)
      .maybeSingle()

    if (existingErr) {
      console.error('Error reading existing google_calendar_tokens:', existingErr)
    }

    const refreshToken = tokens.refresh_token || (existing as any)?.refresh_token || ''
    if (!refreshToken) {
      throw new Error('No refresh token received (try reconnect with prompt=consent)')
    }

    const { error: upsertErr } = await supabase.from('google_calendar_tokens').upsert(
      {
        user_id: decoded.userId,
        refresh_token: refreshToken,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        provider_user_id: null,
        calendar_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (upsertErr) {
      console.error('Error upserting google_calendar_tokens:', upsertErr)
      throw new Error('Failed to store Google Calendar connection')
    }

    /* Redirect back: honor returnTo when it is a safe relative path */
    const safeReturnTo = decoded.returnTo && decoded.returnTo.startsWith('/') ? decoded.returnTo : '/?section=settings'
    const to = new URL(safeReturnTo, appBase)
    to.searchParams.set('google_calendar', 'connected')
    return Response.redirect(to.toString(), 302)
  } catch (err) {
    console.error('google-oauth-callback error:', err)
    const appBase = Deno.env.get('APP_BASE_URL') ?? ''
    if (!appBase) return new Response('OAuth callback error (missing APP_BASE_URL)', { status: 500 })
    const to = new URL('/?section=settings', appBase)
    to.searchParams.set('google_calendar', 'error')
    to.searchParams.set('reason', (err as Error).message ?? 'unknown')
    return Response.redirect(to.toString(), 302)
  }
})
