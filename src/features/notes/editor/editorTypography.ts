/* editorTypography: Shared heading and body styles for all RichTextEditor surfaces */

/**
 * ProseMirror selectors for body + H1–H3 with Bonsai-responsive sizing.
 * Use on both default (notes) and reflection editor variants.
 */
export const EDITOR_HEADING_BODY_PROSE_CLASS =
  '[&_p]:mb-3 [&_p]:text-body [&_p]:leading-relaxed ' +
  '[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-editor-h1 [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-on-surface [&_h1]:first:mt-0 ' +
  '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-editor-h2 [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-on-surface ' +
  '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-editor-h3 [&_h3]:font-semibold [&_h3]:leading-snug [&_h3]:text-on-surface'
