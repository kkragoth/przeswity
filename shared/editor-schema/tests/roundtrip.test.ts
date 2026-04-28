import { describe, it, expect } from 'vitest';
import { markdownToYDocState, yDocStateToMarkdown } from '../src/markdown';

describe('shared editor-schema markdown round-trip', () => {
    it('preserves headings and paragraphs', () => {
        const md = `# Title\n\nFirst paragraph.\n\n## Subhead\n\nSecond paragraph.\n`;
        const state = markdownToYDocState(md);
        const out = yDocStateToMarkdown(state);
        expect(out.replace(/\s+$/g, '')).toContain('# Title');
        expect(out).toContain('First paragraph.');
        expect(out).toContain('## Subhead');
    });
    it('preserves bullet lists', () => {
        const md = `* one\n* two\n* three\n`;
        const out = yDocStateToMarkdown(markdownToYDocState(md));
        expect(out).toContain('one');
        expect(out).toContain('three');
    });
    it('PROSEMIRROR_FIELD is "default"', async () => {
        const { PROSEMIRROR_FIELD } = await import('../src/index');
        expect(PROSEMIRROR_FIELD).toBe('default');
    });
});
