/* descriptionDisplay: Turn plain-text description into safe HTML with clickable links and line breaks */

/**
 * Escape HTML special characters so we can safely inject text into HTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Regex to match a URL (http(s) or www); used to detect links in description text */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[^\s<>"{}|\\^`[\]]+/gi

function normalizeUrl(url: string): string {
  return url.startsWith('www.') ? `https://${url}` : url
}

/**
 * Convert plain-text description to HTML safe for dangerouslySetInnerHTML:
 * escapes HTML, turns URLs into clickable links (target="_blank" rel="noopener"),
 * and preserves line breaks as <br />.
 */
export function descriptionToHtml(description: string): string {
  if (!description?.trim()) return ''
  let result = ''
  let lastIndex = 0
  const re = new RegExp(URL_REGEX.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(description)) !== null) {
    result += escapeHtml(description.slice(lastIndex, m.index))
    const url = m[0]
    const href = normalizeUrl(url)
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-bonsai-sage-600 underline hover:text-bonsai-sage-700">${escapeHtml(url)}</a>`
    lastIndex = m.index + url.length
  }
  result += escapeHtml(description.slice(lastIndex))
  return result.replace(/\n/g, '<br />')
}
