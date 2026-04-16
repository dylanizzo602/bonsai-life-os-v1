/* Google Calendar events edge function: fetch today's events via Google Calendar API */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DateTime } from 'https://esm.sh/luxon@3.5.0'

interface CalendarAgendaEventDto {
  title: string
  location?: string
  start: string
  end?: string
  isAllDay?: boolean
  busyStatus?: 'busy' | 'free'
  source?: string
}

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

/* Create a Supabase client using service role credentials for reading refresh tokens */
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  /* Secrets: Supabase may block names containing "supabase"; prefer SERVICE_ROLE_KEY. */
  const key = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Refresh an access token from a stored refresh token */
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; token_type: string }> {
  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? ''
  if (!clientId || !clientSecret) throw new Error('Missing Google OAuth client credentials')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('Google refresh token error:', res.status, json)
    throw new Error(`Google refresh token failed: ${res.status}`)
  }

  const accessToken = (json as any).access_token as string | undefined
  const tokenType = (json as any).token_type as string | undefined
  if (!accessToken) throw new Error('Missing access_token in refresh response')
  return { access_token: accessToken, token_type: tokenType ?? 'Bearer' }
}

/* Normalize a Google Calendar event into the app's agenda DTO */
function normalizeGoogleEvent(params: {
  item: any
  timeZone: string
}): CalendarAgendaEventDto | null {
  const { item, timeZone } = params
  const title = typeof item?.summary === 'string' && item.summary.trim() ? item.summary.trim() : '(No title)'
  const location = typeof item?.location === 'string' && item.location.trim() ? item.location.trim() : undefined

  // Google uses either dateTime (timed) or date (all-day, YYYY-MM-DD)
  const startDateTime = item?.start?.dateTime as string | undefined
  const startDate = item?.start?.date as string | undefined
  const endDateTime = item?.end?.dateTime as string | undefined
  const endDate = item?.end?.date as string | undefined

  const isAllDay = Boolean(startDate && !startDateTime)
  const start = (() => {
    if (startDateTime) return DateTime.fromISO(startDateTime).toISO()
    if (startDate) return DateTime.fromISO(startDate, { zone: timeZone }).startOf('day').toISO()
    return null
  })()

  const end = (() => {
    if (endDateTime) return DateTime.fromISO(endDateTime).toISO()
    if (endDate) return DateTime.fromISO(endDate, { zone: timeZone }).startOf('day').toISO()
    return undefined
  })()

  if (!start) return null

  // transparency: "transparent" means free
  const transparency = typeof item?.transparency === 'string' ? String(item.transparency).toLowerCase() : ''
  const busyStatus: 'busy' | 'free' | undefined = transparency === 'transparent' ? 'free' : 'busy'

  return {
    title,
    location,
    start,
    end,
    isAllDay,
    busyStatus,
    source: 'Google',
  }
}

/* Edge function handler: fetch and return today's events */
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

    /* Time zone: prefer user profile time_zone; fallback to UTC */
    const timeZone =
      typeof (data.user.user_metadata as any)?.time_zone === 'string'
        ? String((data.user.user_metadata as any).time_zone)
        : 'UTC'

    /* Load refresh token server-side */
    const service = getServiceClient()
    const { data: tokenRow, error: tokenErr } = await service
      .from('google_calendar_tokens')
      .select('refresh_token, calendar_id')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (tokenErr) {
      console.error('Error loading google_calendar_tokens:', tokenErr)
      return new Response(JSON.stringify({ error: 'token_load_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!tokenRow?.refresh_token) {
      return new Response(JSON.stringify({ error: 'not_connected' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* Access token: refresh on demand */
    const { access_token } = await refreshAccessToken(tokenRow.refresh_token)

    /* Today range: in the user's timezone, sent to Google as RFC3339 timestamps */
    const nowZ = DateTime.now().setZone(timeZone || 'UTC')
    const timeMin = nowZ.startOf('day').toISO()!
    const timeMax = nowZ.endOf('day').plus({ millisecond: 1 }).toISO()!

    const calendarId =
      tokenRow.calendar_id && String(tokenRow.calendar_id).trim()
        ? String(tokenRow.calendar_id).trim()
        : 'primary'

    /* Fetch events: expand recurring into single instances for agenda display */
    const eventsUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    )
    eventsUrl.searchParams.set('timeMin', timeMin)
    eventsUrl.searchParams.set('timeMax', timeMax)
    eventsUrl.searchParams.set('singleEvents', 'true')
    eventsUrl.searchParams.set('orderBy', 'startTime')
    eventsUrl.searchParams.set('maxResults', '2500')

    const res = await fetch(eventsUrl.toString(), {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('Google Calendar API error:', res.status, json)
      return new Response(JSON.stringify({ error: 'google_api_error', status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const items = Array.isArray((json as any).items) ? (json as any).items : []
    const events: CalendarAgendaEventDto[] = items
      .map((item: any) => normalizeGoogleEvent({ item, timeZone }))
      .filter(Boolean) as CalendarAgendaEventDto[]

    return new Response(JSON.stringify({ events, countToday: events.length, timeZone }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('google-calendar-events-today error:', err)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
