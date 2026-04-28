export interface Template {
  id: string
  name: string
  description: string
  content: unknown
}

export const TEMPLATES: Template[] = [
    {
        id: 'empty',
        name: 'Empty manuscript',
        description: 'Start from a blank page.',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    {
        id: 'translation',
        name: 'Translation skeleton',
        description: 'Title page, foreword stub, chapters, translator notes.',
        content: {
            type: 'doc',
            content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Author · Original-language title · Translator' }] },
                { type: 'tableOfContents' },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Foreword' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Translator’s note here.' }] },
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter 1' }] },
                { type: 'paragraph' },
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter 2' }] },
                { type: 'paragraph' },
            ],
        },
    },
    {
        id: 'edited-proof',
        name: 'Edited proof',
        description: 'Front matter, chapters, glossary placeholder, footnote example.',
        content: {
            type: 'doc',
            content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Working title' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Brief abstract…' }] },
                { type: 'tableOfContents' },
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Chapter 1 — opening' }] },
                {
                    type: 'paragraph',
                    content: [
                        { type: 'text', text: 'First paragraph of the chapter.' },
                        { type: 'footnote', attrs: { text: 'A note attached to the first paragraph.' } },
                    ],
                },
                {
                    type: 'blockquote',
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: 'A pull-quote that sets the tone.' }],
                        },
                    ],
                },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section 1.1' }] },
                { type: 'paragraph' },
            ],
        },
    },
    {
        id: 'before-composition',
        name: 'Before composition',
        description: 'Final pre-typesetting structure — chapters, parts, blank pages.',
        content: {
            type: 'doc',
            content: [
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
                { type: 'paragraph' },
                { type: 'horizontalRule' },
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Part I' }] },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chapter 1' }] },
                { type: 'paragraph' },
                { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Chapter 2' }] },
                { type: 'paragraph' },
                { type: 'horizontalRule' },
                { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Part II' }] },
                { type: 'paragraph' },
            ],
        },
    },
];
