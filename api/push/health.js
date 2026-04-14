/* Vercel function: basic health check for the push sender endpoint */
export default function handler(_req, res) {
  /* Response: simple JSON so you can test deployment quickly */
  res.status(200).json({ ok: true })
}

