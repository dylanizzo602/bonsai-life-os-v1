/* RichTextEditor: TipTap-based rich text editor with toolbar; saves on blur */

import { useEditor, EditorContent } from '@tiptap/react'
import { useCallback, useEffect, type MutableRefObject } from 'react'
import { createEditorExtensions } from './editor/createEditorExtensions'
import { EDITOR_HEADING_BODY_PROSE_CLASS } from './editor/editorTypography'
import { ReflectionEditorToolbar } from './editor/ReflectionEditorToolbar'
import type { RichTextEditorSaveStatus, RichTextEditorVariant } from './editor/types'

export type { RichTextEditorSaveStatus, RichTextEditorVariant } from './editor/types'

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
  /** Optional editor min-height override (Tailwind class) */
  minHeightClassName?: string
  /** Layout variant: reflection uses document-style toolbar and page */
  variant?: RichTextEditorVariant
  /** Save status shown in reflection toolbar */
  saveStatus?: RichTextEditorSaveStatus
  /** Optional ref to read current HTML without waiting for blur */
  htmlGetterRef?: MutableRefObject<(() => string) | null>
}

/** Quote box styling inside the editor surface */
const QUOTE_BLOCK_CONTENT_CLASS =
  '[&_.editor-quote-block]:my-4 [&_.editor-quote-block]:min-h-[3.5rem] [&_.editor-quote-block]:rounded-xl ' +
  '[&_.editor-quote-block]:border [&_.editor-quote-block]:border-outline-variant/30 ' +
  '[&_.editor-quote-block]:bg-surface-container-low [&_.editor-quote-block]:px-4 [&_.editor-quote-block]:py-3 md:[&_.editor-quote-block]:px-6 md:[&_.editor-quote-block]:py-4 ' +
  '[&_.editor-quote-block_p]:m-0 [&_.editor-quote-block_p]:text-body [&_.editor-quote-block_p]:leading-relaxed [&_.editor-quote-block_p]:text-on-surface'

/** Shared prose classes for editor content areas */
const REFLECTION_CONTENT_CLASS =
  'min-h-[600px] text-body leading-relaxed text-on-surface-variant focus:outline-none ' +
  EDITOR_HEADING_BODY_PROSE_CLASS + ' ' +
  QUOTE_BLOCK_CONTENT_CLASS + ' ' +
  '[&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 [&_ul]:marker:text-primary ' +
  '[&_ul.editor-list-dashed]:list-none [&_ul.editor-list-dashed]:pl-0 ' +
  '[&_ul.editor-list-dashed>li]:relative [&_ul.editor-list-dashed>li]:pl-5 ' +
  "[&_ul.editor-list-dashed>li]:before:absolute [&_ul.editor-list-dashed>li]:before:left-0 [&_ul.editor-list-dashed>li]:before:text-primary [&_ul.editor-list-dashed>li]:before:content-['–'] " +
  '[&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_li]:ml-0 ' +
  '[&_strong]:font-bold [&_em]:italic [&_u]:underline [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg'

function getDefaultContentClass(minHeightClassName: string) {
  return (
    `${minHeightClassName} text-body text-bonsai-slate-800 focus:outline-none ` +
    EDITOR_HEADING_BODY_PROSE_CLASS + ' ' +
    QUOTE_BLOCK_CONTENT_CLASS + ' ' +
    '[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4 ' +
    '[&_ul.editor-list-dashed]:list-none [&_ul.editor-list-dashed>li]:relative [&_ul.editor-list-dashed>li]:pl-5 ' +
    "[&_ul.editor-list-dashed>li]:before:absolute [&_ul.editor-list-dashed>li]:before:left-0 [&_ul.editor-list-dashed>li]:before:content-['–'] " +
    '[&_strong]:font-bold [&_em]:italic [&_u]:underline'
  )
}

/**
 * Rich text editor with formatting toolbar. Saves on blur.
 */
export function RichTextEditor({
  value,
  onBlur,
  placeholder = 'Start writing…',
  editorKey,
  className = '',
  minHeightClassName = 'min-h-[280px]',
  variant = 'default',
  saveStatus = 'saved',
  htmlGetterRef,
}: RichTextEditorProps) {
  const handleBlur = useCallback(
    (html: string) => {
      onBlur(html)
    },
    [onBlur],
  )

  const isReflection = variant === 'reflection'

  const editor = useEditor(
    {
      extensions: createEditorExtensions({ variant }),
      content: value || '',
      editorProps: {
        attributes: {
          class: isReflection
            ? REFLECTION_CONTENT_CLASS
            : getDefaultContentClass(minHeightClassName),
          spellcheck: 'true',
        },
      },
    },
    [editorKey, variant],
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

  /* Expose live HTML getter for template draft snapshots */
  useEffect(() => {
    if (!editor || !htmlGetterRef) return
    htmlGetterRef.current = () => editor.getHTML()
    return () => {
      htmlGetterRef.current = null
    }
  }, [editor, htmlGetterRef])

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
    return (
      <div
        className={`${isReflection ? 'min-h-[600px]' : minHeightClassName} ${className}`}
        aria-hidden
      />
    )
  }

  const toolbar = (
    <ReflectionEditorToolbar
      editor={editor}
      variant={variant}
      saveStatus={isReflection ? saveStatus : undefined}
    />
  )

  /* Reflection layout: toolbar above paper-style page */
  if (isReflection) {
    return (
      <div className={`notes-rich-editor ${className}`} data-placeholder={placeholder}>
        {toolbar}
        <div className="relative mt-8 min-h-[1000px] overflow-hidden rounded-sm bg-surface-container-lowest p-8 shadow-[0_4px_24px_-2px_rgba(81,96,81,0.06)] md:p-20">
          <div className="absolute left-0 top-0 h-1 w-full bg-primary/20" aria-hidden />
          <EditorContent editor={editor} spellCheck />
        </div>
      </div>
    )
  }

  /* Default layout: toolbar above editor content */
  return (
    <div className={`notes-rich-editor ${className}`} data-placeholder={placeholder}>
      {toolbar}
      <EditorContent editor={editor} spellCheck />
    </div>
  )
}
