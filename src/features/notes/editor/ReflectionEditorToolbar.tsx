/* ReflectionEditorToolbar: Full formatting toolbar for reflection document editor */

import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/core'
import type { RichTextEditorSaveStatus } from './types'
import {
  EditorToolbarDropdown,
  EditorToolbarSplitButton,
  ToolbarDivider,
  ToolbarIconButton,
  ToolbarSaveStatus,
} from './EditorToolbarDropdown'
import {
  getActiveBlockLabel,
  insertImageFromFile,
  setBlockStyle,
  setLinkFromSelection,
  setListStyle,
  setTextAlign,
  toggleQuoteBlock,
  type AlignStyle,
  type BlockStyle,
} from './editorToolbarActions'

interface ReflectionEditorToolbarProps {
  editor: Editor
  saveStatus?: RichTextEditorSaveStatus
  variant?: 'reflection' | 'default'
}

/**
 * Document formatting toolbar: text style, alignment, inline marks, lists, media, optional save status.
 */
export function ReflectionEditorToolbar({
  editor,
  saveStatus,
  variant = 'reflection',
}: ReflectionEditorToolbarProps) {
  const [tick, setTick] = useState(0)

  /* Re-render toolbar when selection or document changes */
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    editor.on('selectionUpdate', bump)
    editor.on('transaction', bump)
    return () => {
      editor.off('selectionUpdate', bump)
      editor.off('transaction', bump)
    }
  }, [editor])

  void tick

  const btn =
    variant === 'reflection'
      ? 'rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high focus:outline-none focus:ring-2 focus:ring-primary/30'
      : 'rounded p-2 text-bonsai-slate-600 transition-colors hover:bg-bonsai-slate-100 hover:text-bonsai-slate-800 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500'
  const btnActive =
    variant === 'reflection'
      ? 'bg-surface-container-high font-bold text-primary'
      : 'bg-bonsai-sage-100 font-bold text-bonsai-sage-700'
  const dividerClass =
    variant === 'reflection'
      ? 'mx-1 h-4 w-px bg-outline-variant'
      : 'mx-0.5 h-5 w-px bg-bonsai-slate-200'

  const blockLabel = getActiveBlockLabel(editor)

  const isListActive =
    editor.isActive('bulletList') || editor.isActive('orderedList')
  const isDashedList =
    editor.isActive('bulletList') &&
    editor.getAttributes('bulletList').listStyle === 'dashed'

  const textStyleItems = useMemo(
    () => [
      {
        id: 'body',
        label: 'Body',
        icon: 'notes',
        active: !editor.isActive('heading'),
        onSelect: () => setBlockStyle(editor, 'body'),
      },
      ...([1, 2, 3, 4, 5, 6] as const).map((level) => ({
        id: `h${level}`,
        label: `Heading ${level}`,
        icon: 'title',
        active: editor.isActive('heading', { level }),
        onSelect: () => setBlockStyle(editor, level as BlockStyle),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tick],
  )

  const alignItems = useMemo(
    () =>
      (['left', 'center', 'right', 'justify'] as AlignStyle[]).map((align) => ({
        id: align,
        label: align.charAt(0).toUpperCase() + align.slice(1),
        icon:
          align === 'left'
            ? 'format_align_left'
            : align === 'center'
              ? 'format_align_center'
              : align === 'right'
                ? 'format_align_right'
                : 'format_align_justify',
        active: editor.isActive({ textAlign: align }),
        onSelect: () => setTextAlign(editor, align),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tick],
  )

  const listMenuItems = useMemo(
    () => [
      {
        id: 'dashed',
        label: 'Dashed list',
        icon: 'remove',
        active: isDashedList,
        onSelect: () => setListStyle(editor, 'dashed'),
      },
      {
        id: 'ordered',
        label: 'Numbered list',
        icon: 'format_list_numbered',
        active: editor.isActive('orderedList'),
        onSelect: () => setListStyle(editor, 'ordered'),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tick, isDashedList],
  )

  const activeAlign = alignItems.find((item) => item.active)?.label ?? 'Left'
  const activeAlignIcon =
    alignItems.find((item) => item.active)?.icon ?? 'format_align_left'

  return (
    <div
      className={
        variant === 'reflection'
          ? 'flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 pb-4'
          : 'mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-bonsai-slate-200 pb-2'
      }
      role="toolbar"
      aria-label="Text formatting"
    >
      <div className="flex flex-wrap items-center gap-1">
        {/* Text style: H1–H6 and body */}
        <EditorToolbarDropdown
          label={blockLabel}
          triggerIcon="title"
          items={textStyleItems}
          isActive={editor.isActive('heading')}
          btnClass={btn}
          btnActiveClass={btnActive}
          ariaLabel="Text style"
        />

        <ToolbarDivider className={dividerClass} />

        {/* Paragraph alignment: icon-only trigger */}
        <EditorToolbarDropdown
          label={activeAlign}
          triggerIcon={activeAlignIcon}
          showLabel={false}
          items={alignItems}
          isActive={alignItems.some((item) => item.active && item.id !== 'left')}
          btnClass={btn}
          btnActiveClass={btnActive}
          ariaLabel="Paragraph alignment"
        />

        <ToolbarDivider className={dividerClass} />

        {/* Inline formatting */}
        <ToolbarIconButton
          icon="format_bold"
          title="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          btnClass={btn}
          btnActiveClass={btnActive}
        />
        <ToolbarIconButton
          icon="format_italic"
          title="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          btnClass={btn}
          btnActiveClass={btnActive}
          className={editor.isActive('italic') ? 'italic' : ''}
        />
        <ToolbarIconButton
          icon="format_underlined"
          title="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          btnClass={btn}
          btnActiveClass={btnActive}
        />

        <ToolbarDivider className={dividerClass} />

        {/* Lists: bullet with dashed/numbered dropdown */}
        <EditorToolbarSplitButton
          icon="format_list_bulleted"
          title="Bullet list"
          active={isListActive && !editor.isActive('orderedList')}
          onPrimaryClick={() => setListStyle(editor, 'bullet')}
          items={listMenuItems}
          btnClass={btn}
          btnActiveClass={btnActive}
        />

        <ToolbarDivider className={dividerClass} />

        {/* Image, quote block, and link */}
        <ToolbarIconButton
          icon="image"
          title="Insert image"
          onClick={() => insertImageFromFile(editor)}
          btnClass={btn}
          btnActiveClass={btnActive}
        />
        <ToolbarIconButton
          icon="format_quote"
          title="Quote block"
          active={editor.isActive('quoteBlock')}
          onClick={() => toggleQuoteBlock(editor)}
          btnClass={btn}
          btnActiveClass={btnActive}
        />
        <ToolbarIconButton
          icon="link"
          title="Create link"
          active={editor.isActive('link')}
          onClick={() => setLinkFromSelection(editor)}
          btnClass={btn}
          btnActiveClass={btnActive}
        />
      </div>

      {saveStatus !== undefined && <ToolbarSaveStatus saveStatus={saveStatus} />}
    </div>
  )
}
