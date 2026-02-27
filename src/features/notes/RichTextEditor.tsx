/* RichTextEditor: TipTap-based rich text editor with toolbar; no border/box, saves on blur */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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

/** Toolbar: Bold, Italic, bullet list, numbered list, H1, H2; highlights when active */
function EditorToolbar({ editor }: { editor: Editor }) {
  const [active, setActive] = useState({
    bold: false,
    italic: false,
    bulletList: false,
    orderedList: false,
    heading1: false,
    heading2: false,
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
      extensions: [StarterKit],
      content: value || '',
      editorProps: {
        attributes: {
          class:
            'min-h-[280px] text-body text-bonsai-slate-800 focus:outline-none [&_p]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 [&_h1]:text-page-title [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_strong]:font-bold [&_em]:italic',
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
      <EditorContent editor={editor} />
    </div>
  )
}
