/* editorToolbarActions: Shared TipTap commands for rich text toolbar controls */

import type { Editor } from '@tiptap/core'

export type BlockStyle = 'body' | 1 | 2 | 3
export type ListStyle = 'bullet' | 'dashed' | 'ordered'
export type AlignStyle = 'left' | 'center' | 'right' | 'justify'

/** Resolve the current block label for the text-style dropdown */
export function getActiveBlockLabel(editor: Editor): string {
  for (let level = 1; level <= 3; level++) {
    if (editor.isActive('heading', { level })) return `Heading ${level}`
  }
  return 'Body'
}

/** Apply heading level or body paragraph */
export function setBlockStyle(editor: Editor, style: BlockStyle) {
  if (style === 'body') {
    editor.chain().focus().setParagraph().run()
    return
  }
  editor.chain().focus().setHeading({ level: style }).run()
}

/** Apply paragraph alignment */
export function setTextAlign(editor: Editor, align: AlignStyle) {
  editor.chain().focus().setTextAlign(align).run()
}

/** Apply bullet, dashed, or numbered list */
export function setListStyle(editor: Editor, style: ListStyle) {
  if (style === 'ordered') {
    editor.chain().focus().toggleOrderedList().run()
    return
  }

  const listStyle = style === 'dashed' ? 'dashed' : 'disc'

  if (editor.isActive('orderedList')) {
    editor
      .chain()
      .focus()
      .toggleOrderedList()
      .toggleBulletList()
      .updateAttributes('bulletList', { listStyle })
      .run()
    return
  }

  if (editor.isActive('bulletList')) {
    editor.chain().focus().updateAttributes('bulletList', { listStyle }).run()
    return
  }

  editor.chain().focus().toggleBulletList().updateAttributes('bulletList', { listStyle }).run()
}

/** Prompt for URL and wrap the current selection in a link */
export function setLinkFromSelection(editor: Editor) {
  const { from, to } = editor.state.selection
  if (from === to) {
    // eslint-disable-next-line no-alert
    window.alert('Select the text you want to turn into a link first.')
    return
  }

  const previousUrl = editor.getAttributes('link')?.href as string | undefined
  // eslint-disable-next-line no-alert
  const urlInput = window.prompt('URL for this link (e.g. https://example.com):', previousUrl ?? '')
  if (!urlInput?.trim()) return

  editor.chain().focus().extendMarkRange('link').setLink({ href: urlInput.trim() }).run()
}

/** Open a file picker and insert the chosen image as a base64 embed */
export function insertImageFromFile(editor: Editor) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result
      if (typeof src === 'string') {
        editor.chain().focus().setImage({ src }).run()
      }
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

/** Insert an empty quote box, or wrap the current text selection inside one */
export function toggleQuoteBlock(editor: Editor) {
  if (editor.isActive('quoteBlock')) {
    editor.chain().focus().lift('quoteBlock').run()
    return
  }

  const { empty, from, to } = editor.state.selection

  /* Wrap highlighted text in a quote box */
  if (!empty) {
    const text = editor.state.doc.textBetween(from, to, '\n').trim()
    editor
      .chain()
      .focus()
      .deleteSelection()
      .insertContent({
        type: 'quoteBlock',
        content: [
          {
            type: 'paragraph',
            ...(text ? { content: [{ type: 'text', text }] } : {}),
          },
        ],
      })
      .run()
    return
  }

  /* No selection: insert an empty quote box */
  editor.chain().focus().insertQuoteBlock().run()
}
