/* QuoteBlockExtension: Bordered callout box for highlighted or new text */

import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quoteBlock: {
      /** Insert an empty quote box at the cursor */
      insertQuoteBlock: () => ReturnType
      /** Toggle quote box for the current block or lift out of one */
      toggleQuoteBlock: () => ReturnType
    }
  }
}

/**
 * TipTap node for a simple bordered box (empty or with wrapped paragraph content).
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
      0,
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
              content: [{ type: 'paragraph' }],
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
