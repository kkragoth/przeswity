import { describe, expect, it } from 'vitest';
import { buildInlineLines, buildSbsRows } from '@/editor/versions/buildDiffDocument';

describe('buildInlineLines', () => {
    it('no change — all lines are eq', () => {
        const lines = buildInlineLines('hello\nworld\n', 'hello\nworld\n');
        expect(lines.every((l) => l.kind === 'eq')).toBe(true);
        expect(lines).toHaveLength(2);
    });

    it('pure insertion — adds ins lines', () => {
        const lines = buildInlineLines('', 'new line\n');
        expect(lines).toHaveLength(1);
        expect(lines[0].kind).toBe('ins');
        expect(lines[0].text).toBe('new line');
    });

    it('pure deletion — adds del lines', () => {
        const lines = buildInlineLines('old line\n', '');
        expect(lines).toHaveLength(1);
        expect(lines[0].kind).toBe('del');
        expect(lines[0].text).toBe('old line');
    });

    it('replacement — del before ins', () => {
        const lines = buildInlineLines('foo\n', 'bar\n');
        expect(lines).toHaveLength(2);
        expect(lines[0].kind).toBe('del');
        expect(lines[1].kind).toBe('ins');
    });
});

describe('buildSbsRows', () => {
    it('no change — both sides equal', () => {
        const rows = buildSbsRows('a\nb\n', 'a\nb\n');
        expect(rows).toHaveLength(2);
        expect(rows.every((r) => r.left?.kind === 'eq' && r.right?.kind === 'eq')).toBe(true);
    });

    it('pure insertion — right side populated', () => {
        const rows = buildSbsRows('', 'added\n');
        expect(rows).toHaveLength(1);
        expect(rows[0].left).toBeUndefined();
        expect(rows[0].right?.kind).toBe('ins');
    });

    it('pure deletion — left side populated', () => {
        const rows = buildSbsRows('removed\n', '');
        expect(rows).toHaveLength(1);
        expect(rows[0].right).toBeUndefined();
        expect(rows[0].left?.kind).toBe('del');
    });

    it('replacement — del on left, ins on right', () => {
        const rows = buildSbsRows('old\n', 'new\n');
        expect(rows).toHaveLength(1);
        expect(rows[0].left?.kind).toBe('del');
        expect(rows[0].right?.kind).toBe('ins');
    });
});
