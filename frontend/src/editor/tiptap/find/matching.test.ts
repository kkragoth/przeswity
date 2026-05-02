import { describe, it, expect } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { computeMatches } from './matching';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { content: 'inline*', group: 'block' },
        text: { group: 'inline' },
    },
    marks: {},
});

function makeDoc(...texts: string[]) {
    return schema.node('doc', null, texts.map((t) =>
        schema.node('paragraph', null, t ? [schema.text(t)] : []),
    ));
}

describe('computeMatches', () => {
    it('returns empty array for empty query', () => {
        const doc = makeDoc('hello world');
        expect(computeMatches(doc, '', false)).toEqual([]);
    });

    it('returns empty array when there are no matches', () => {
        const doc = makeDoc('hello world');
        expect(computeMatches(doc, 'xyz', false)).toEqual([]);
    });

    it('finds multiple matches in one paragraph', () => {
        const doc = makeDoc('aababaa');
        const matches = computeMatches(doc, 'a', true);
        // paragraph node starts at pos 1 (doc>paragraph offset 0), text at pos 1
        // positions: 1,2,3,4,5,6,7 => 'a','a','b','a','b','a','a'
        expect(matches.length).toBe(5);
    });

    it('is case insensitive by default', () => {
        const doc = makeDoc('Hello HELLO hello');
        const matches = computeMatches(doc, 'hello', false);
        expect(matches.length).toBe(3);
    });

    it('respects caseSensitive=true', () => {
        const doc = makeDoc('Hello HELLO hello');
        const matches = computeMatches(doc, 'hello', true);
        expect(matches.length).toBe(1);
    });

    it('returns correct from/to positions', () => {
        const doc = makeDoc('abc');
        // doc(1) > paragraph(1) > text: 'abc' starts at pos 1
        const matches = computeMatches(doc, 'b', true);
        expect(matches).toHaveLength(1);
        expect(matches[0].to - matches[0].from).toBe(1);
    });

    it('matches across multiple paragraphs', () => {
        const doc = makeDoc('foo', 'foo', 'bar');
        const matches = computeMatches(doc, 'foo', true);
        expect(matches.length).toBe(2);
    });
});
