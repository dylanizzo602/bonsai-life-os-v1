/* RichTextEditor: TipTap-based rich text editor with toolbar; no border/box, saves on blur */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useCallback, useEffect, useState } from 'react'
import type { Editor } from '@tiptap/core'

interface RichTextEditorProps {
  /** HTML content (e.g. from note.content) */
  value: string
  /** Called when user blurs the editor with the current HTML */
  onBlur: (html: string) => void
  /** Placeholder when empty */
  placeholder?: string
  /** Unique key so editor remounts when note changes (e.g. noteId) */
  editorKey: string
  /** Optional class for the wrapper */
  className?: string
}

/* Toolbar button icons: Bold, Italic, bullet list, numbered list, H1, H2 */
function BoldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  )
}
function ItalicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
    </svg>
  )
}
function ListBulletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z" />
    </svg>
  )
}
function ListNumberIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z" />
    </svg>
  )
}
function Heading1Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M5 4v3h5.5v12h3V7H19V4z" />
    </svg>
  )
}
function Heading2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 4v3h5.5v12h3V7H19V4h-9.5v3H3zm14.5 6.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm4.5 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
    </svg>
  )
}
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        d="M10.59 13.41a1.5 1.5 0 0 0 2.12 0l3.88-3.88a3 3 0 0 0-4.24-4.24L11 6.76"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.41 10.59a1.5 1.5 0 0 0-2.12 0l-3.88 3.88a3 3 0 0 0 4.24 4.24L13 17.24"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function UnlinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        d="M9.17 9.17 7.05 7.05m3.54 6.24-2.83 2.83a3 3 0 0 0 4.24 4.24l1.41-1.41m-1.59-5.07 2.83-2.83m1.24-1.24 2.12-2.12a3 3 0 0 0-4.24-4.24L13 5.17"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4l16 16"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Toolbar: Bold, Italic, bullet list, numbered list, H1, H2; highlights when active */
function EditorToolbar({ editor }: { editor: Editor }) {
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    bulletList: false,
    orderedList: false,
    heading1: false,
    heading2: false,
    link: false,
  })

  /* Update active state on selection/transaction so toolbar reflects current format */
  useEffect(() => {
    const updateActive = () => {
      setActive({
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        heading1: editor.isActive('heading', { level: 1 }),
        heading2: editor.isActive('heading', { level: 2 }),
        link: editor.isActive('link'),
      })
    }
    updateActive()
    editor.on('selectionUpdate', updateActive)
    editor.on('transaction', updateActive)
    return () => {
      editor.off('selectionUpdate', updateActive)
      editor.off('transaction', updateActive)
    }
  }, [editor])

  const btn =
    'p-2 rounded text-bonsai-slate-600 hover:bg-bonsai-slate-100 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500'
  const btnActive = 'bg-bonsai-sage-100 text-bonsai-sage-700'

  /* Link handlers: add/update link for current selection, or remove link mark */
  const handleSetLink = () => {
    const selection = editor.state.selection
    const from = selection.from
    const to = selection.to

    // Require a non-empty selection to turn into a link; user chooses anchor text directly in the editor.
    if (from === to) {
      // eslint-disable-next-line no-alert
      window.alert('Select the text you want to turn into a link first.')
      return
    }

    const previousUrl = editor.getAttributes('link')?.href as string | undefined
    // eslint-disable-next-line no-alert
    const urlInput = window.prompt(
      'URL for this link (e.g. https://example.com):',
      previousUrl ?? '',
    )
    if (!urlInput) return
    const url = urlInput.trim()
    if (!url) return

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run()
  }

  const handleUnsetLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-bonsai-slate-200 pb-2 mb-2"
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${active.bold ? btnActive : ''}`}
        title="Bold"
        aria-pressed={active.bold}
      >
        <BoldIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${active.italic ? btnActive : ''}`}
        title="Italic"
        aria-pressed={active.italic}
      >
        <ItalicIcon className="h-5 w-5" />
      </button>
      <span className="w-px h-5 bg-bonsai-slate-200 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${active.bulletList ? btnActive : ''}`}
        title="Bullet list"
        aria-pressed={active.bulletList}
      >
        <ListBulletIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${active.orderedList ? btnActive : ''}`}
        title="Numbered list"
        aria-pressed={active.orderedList}
      >
        <ListNumberIcon className="h-5 w-5" />
      </button>
      <span className="w-px h-5 bg-bonsai-slate-200 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${btn} ${active.heading1 ? btnActive : ''}`}
        title="Heading 1"
        aria-pressed={active.heading1}
      >
        <Heading1Icon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn} ${active.heading2 ? btnActive : ''}`}
        title="Heading 2"
        aria-pressed={active.heading2}
      >
        <Heading2Icon className="h-5 w-5" />
      </button>
      <span className="w-px h-5 bg-bonsai-slate-200 mx-0.5" aria-hidden />
      <button
        type="button"
        onClick={handleSetLink}
        className={`${btn} ${active.link ? btnActive : ''}`}
        title="Add or edit link"
        aria-pressed={active.link}
      >
        <LinkIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleUnsetLink}
        className={btn}
        title="Remove link"
      >
        <UnlinkIcon className="h-5 w-5" />
      </button>
    </div>
  )
}

/**
 * Rich text editor with toolbar (bold, italic, lists, headings) and no border/box. Saves on blur.
 */
export function RichTextEditor({
  value,
  onBlur,
  placeholder = 'Start writing…',
  editorKey,
  className = '',
}: RichTextEditorProps) {
  const handleBlur = useCallback(
    (html: string) => {
      onBlur(html)
    },
    [onBlur],
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Link.configure({
          /* Link behavior: auto-detect URLs, open in new tab, and style with Bonsai link colors */
          autolink: true,
          linkOnPaste: true,
          openOnClick: true,
          HTMLAttributes: {
            class:
              'text-bonsai-sage-600 underline hover:text-bonsai-sage-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500',
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
      ],
      content: value || '',
      editorProps: {
        attributes: {
          /* Editor content attributes: typography, spacing, and spell check enabled for rich text */
          class:
            'min-h-[280px] text-body text-bonsai-slate-800 focus:outline-none [&_p]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_h1]:text-page-title [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_strong]:font-bold [&_em]:italic',
          spellcheck: 'true',
        },
      },
    },
    [editorKey],
  )

  /* Save content on blur */
  useEffect(() => {
    if (!editor) return
    const onEditorBlur = () => handleBlur(editor.getHTML())
    editor.on('blur', onEditorBlur)
    return () => {
      editor.off('blur', onEditorBlur)
    }
  }, [editor, handleBlur])

  /* When value changes externally (e.g. note switch), sync content */
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const normalized = value || '<p></p>'
    if (current !== normalized) {
      editor.commands.setContent(normalized, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) {
    return <div className={`min-h-[280px] ${className}`} aria-hidden />
  }

  /* Wrapper: toolbar above editor content; no border/box on content */
  return (
    <div className={`notes-rich-editor ${className}`} data-placeholder={placeholder}>
      <EditorToolbar editor={editor} />
      {/* Editor content: enable native browser spell check on the editable area */}
      <EditorContent editor={editor} spellCheck />
    </div>
  )
}
