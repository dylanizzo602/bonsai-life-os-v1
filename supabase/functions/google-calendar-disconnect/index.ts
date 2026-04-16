/* Google Calendar disconnect edge function: delete stored refresh token row for the authenticated user */
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

/* Create a Supabase client using service role credentials for deleting refresh tokens */
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  /* Secrets: Supabase may block names containing "supabase"; prefer SERVICE_ROLE_KEY. */
  const key = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Edge function handler: disconnects the current user */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    /* Auth check: require an authenticated Supabase user */
    const authed = getAuthedClient(req)
    const { data, error } = await authed.auth.getUser()
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* Delete token row server-side */
    const service = getServiceClient()
    const { error: delErr } = await service
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', data.user.id)

    if (delErr) {
      console.error('Error deleting google_calendar_tokens:', delErr)
      return new Response(JSON.stringify({ error: 'disconnect_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('google-calendar-disconnect error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
