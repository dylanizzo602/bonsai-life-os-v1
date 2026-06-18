/* submit-feedback edge function: Email bug reports and feature requests via Resend */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FEEDBACK_BUCKET = 'feedback-screenshots'
const MAX_MESSAGE_LENGTH = 5000

type FeedbackType = 'bug' | 'feature'

interface FeedbackBody {
  type?: FeedbackType
  message?: string
  storagePath?: string
  pageUrl?: string
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

/* Auth lookup: resolve current user via the Auth HTTP API */
async function getAuthenticatedUser(
  req: Request,
): Promise<{ id: string; email: string | null } | null> {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!url || !anon || !authHeader) return null

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anon,
      Authorization: authHeader,
    },
  })

  if (!res.ok) return null
  const user = (await res.json()) as { id?: string; email?: string | null }
  return user?.id ? { id: user.id, email: user.email ?? null } : null
}

/* Service role client for downloading private screenshots */
function getServiceClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return createClient(url, key, { auth: { persistSession: false } })
}

/* Validate request body */
function parseBody(raw: unknown): { type: FeedbackType; message: string; storagePath?: string; pageUrl?: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as FeedbackBody
  if (body.type !== 'bug' && body.type !== 'feature') return null
  if (typeof body.message !== 'string') return null
  const message = body.message.trim()
  if (!message || message.length > MAX_MESSAGE_LENGTH) return null
  const storagePath = typeof body.storagePath === 'string' && body.storagePath.trim()
    ? body.storagePath.trim()
    : undefined
  const pageUrl = typeof body.pageUrl === 'string' && body.pageUrl.trim()
    ? body.pageUrl.trim()
    : undefined
  return { type: body.type, message, storagePath, pageUrl }
}

/* Download screenshot bytes when a storage path is provided */
async function downloadScreenshot(
  storagePath: string,
): Promise<{ filename: string; content: Uint8Array; contentType: string } | null> {
  const service = getServiceClient()
  const { data, error } = await service.storage.from(FEEDBACK_BUCKET).download(storagePath)
  if (error || !data) {
    console.error('Failed to download feedback screenshot:', error)
    return null
  }
  const bytes = new Uint8Array(await data.arrayBuffer())
  const filename = storagePath.split('/').pop() ?? 'screenshot.png'
  const contentType = data.type || 'image/png'
  return { filename, content: bytes, contentType }
}

/* Encode bytes as base64 for Resend attachment API */
function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/* Send email via Resend HTTP API */
async function sendResendEmail(params: {
  to: string
  from: string
  subject: string
  text: string
  attachment?: { filename: string; content: string; content_type?: string }
}): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  if (!apiKey) {
    throw new Error('email_not_configured')
  }

  const payload: Record<string, unknown> = {
    from: params.from,
    to: [params.to],
    subject: params.subject,
    text: params.text,
  }

  if (params.attachment) {
    payload.attachments = [
      {
        filename: params.attachment.filename,
        content: params.attachment.content,
        content_type: params.attachment.content_type,
      },
    ]
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('Resend API error:', res.status, errText)
    throw new Error('email_send_failed')
  }
}

/* Edge function handler */
serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = buildCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    /* Auth check: require an authenticated Supabase user */
    const user = await getAuthenticatedUser(req)
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* Parse and validate body */
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_json' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const parsed = parseBody(rawBody)
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    /* Screenshot path must belong to the authenticated user */
    if (parsed.storagePath && !parsed.storagePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: 'invalid_storage_path' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const toEmail = Deno.env.get('FEEDBACK_TO_EMAIL') ?? 'dylan@dylanizzo.com'
    const fromEmail = Deno.env.get('FEEDBACK_FROM_EMAIL') ?? ''
    if (!fromEmail) {
      console.error('FEEDBACK_FROM_EMAIL is not configured')
      return new Response(JSON.stringify({ error: 'email_not_configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const typeLabel = parsed.type === 'bug' ? 'Bug Report' : 'Feature Request'
    const subjectPrefix = parsed.type === 'bug' ? '[Bonsai Bug]' : '[Bonsai Feature]'
    const preview = parsed.message.length > 60 ? `${parsed.message.slice(0, 60)}…` : parsed.message

    const textLines = [
      `Type: ${typeLabel}`,
      `From: ${user.email ?? '(no email on file)'}`,
      `User ID: ${user.id}`,
      `Submitted: ${new Date().toISOString()}`,
      parsed.pageUrl ? `Page: ${parsed.pageUrl}` : null,
      '',
      '--- Message ---',
      parsed.message,
    ].filter((line): line is string => line !== null)

    let attachment: { filename: string; content: string; content_type?: string } | undefined
    if (parsed.storagePath) {
      const file = await downloadScreenshot(parsed.storagePath)
      if (file) {
        attachment = {
          filename: file.filename,
          content: toBase64(file.content),
          content_type: file.contentType,
        }
        textLines.push('', 'Screenshot attached.')
      } else {
        textLines.push('', '(Screenshot upload could not be retrieved.)')
      }
    }

    await sendResendEmail({
      to: toEmail,
      from: fromEmail,
      subject: `${subjectPrefix} ${preview}`,
      text: textLines.join('\n'),
      attachment,
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('submit-feedback error:', err)
    const message = err instanceof Error && err.message === 'email_not_configured'
      ? 'email_not_configured'
      : 'internal_error'
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'email_not_configured' ? 503 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
