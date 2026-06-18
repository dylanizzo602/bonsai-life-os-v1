/* createEditorExtensions: TipTap extension bundle for notes and reflection editors */

import StarterKit from '@tiptap/starter-kit'
import BulletList from '@tiptap/extension-bullet-list'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import type { RichTextEditorVariant } from './types'
import { QuoteBlock } from './QuoteBlockExtension'

interface CreateEditorExtensionsOptions {
  variant: RichTextEditorVariant
}

/** Bullet list with disc or dashed marker styles */
const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: 'disc',
        parseHTML: (element) => element.getAttribute('data-list-style') ?? 'disc',
        renderHTML: (attributes) => {
          const style = attributes.listStyle as string
          return {
            'data-list-style': style,
            class: style === 'dashed' ? 'editor-list-dashed' : undefined,
          }
        },
      },
    }
  },
})

/**
 * Build TipTap extensions shared by notes and reflection rich text editors.
 */
export function createEditorExtensions({ variant }: CreateEditorExtensionsOptions) {
  const isReflection = variant === 'reflection'

  const linkClass = isReflection
    ? 'text-primary underline hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/30'
    : 'text-bonsai-sage-600 underline hover:text-bonsai-sage-700 focus:outline-none focus:ring-2 focus:ring-bonsai-sage-500'

  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      bulletList: false,
    }),
    StyledBulletList,
    QuoteBlock,
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Image.configure({
      allowBase64: true,
      HTMLAttributes: {
        class: 'max-w-full rounded-lg my-4',
      },
    }),
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: true,
      HTMLAttributes: {
        class: linkClass,
        rel: 'noopener noreferrer',
        target: '_blank',
      },
    }),
  ]
}
