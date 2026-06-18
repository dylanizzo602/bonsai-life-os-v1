/* QuoteBlockExtension: Card-style quote block with bonsai accent for reflection editor */

import { Node, mergeAttributes } from '@tiptap/core'

/** Public asset shown on the right side of quote blocks */
export const QUOTE_BLOCK_ICON_SRC = '/images/reflection-quote-bonsai.png'

/** Default placeholder text when inserting a new quote block */
export const QUOTE_BLOCK_DEFAULT_TEXT =
  'Productivity is not about efficiency; it\'s about being effective in the things that truly matter for your legacy.'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quoteBlock: {
      /** Insert a styled quote block at the cursor */
      insertQuoteBlock: () => ReturnType
      /** Toggle quote block for the current block or selection */
      toggleQuoteBlock: () => ReturnType
    }
  }
}

/**
 * TipTap node for the reflection quote card: italic quote text + bonsai image accent.
 */
export const QuoteBlock = Node.create({
  name: 'quoteBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="quote-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'quote-block',
        class: 'editor-quote-block',
      }),
      [
        'div',
        { class: 'editor-quote-block__inner' },
        ['div', { class: 'editor-quote-block__content' }, 0],
        [
          'div',
          { class: 'editor-quote-block__media', 'aria-hidden': 'true' },
          [
            'img',
            {
              src: QUOTE_BLOCK_ICON_SRC,
              alt: '',
              class: 'editor-quote-block__image',
              draggable: 'false',
              contenteditable: 'false',
            },
          ],
        ],
      ],
    ]
  },

  addCommands() {
    return {
      insertQuoteBlock:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({
              type: this.name,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: `"${QUOTE_BLOCK_DEFAULT_TEXT}"` }],
                },
              ],
            })
            .run(),

      toggleQuoteBlock:
        () =>
        ({ chain, editor }) => {
          if (editor.isActive(this.name)) {
            return chain().focus().lift(this.name).run()
          }
          return chain().focus().wrapIn(this.name).run()
        },
    }
  },
})
