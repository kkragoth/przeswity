import type { Editor } from '@tiptap/react';
import { makeId } from '@/editor/utils';

export interface AiAuthor {
  id: string
  name: string
  color: string
}

export const AI_ASSISTANT_ID = 'ai-assistant';

/** i18n key for the AI assistant display name: `editor.ai.assistantName` */
export const DEFAULT_AI: AiAuthor = {
    id: AI_ASSISTANT_ID,
    name: 'AI Assistant',
    color: '#9333ea',
};

const META_SKIP = 'suggestionMode/skip';

// Mock AI rephrase. Replace with a real Anthropic / OpenAI call later.
async function fakeRephrase(text: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    if (text.length < 4) return text;
    // Simple deterministic transform so the demo "shows" something happened
    const cleaned = text.trim().replace(/\s+/g, ' ');
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const reworded = sentences
        .map((s) => {
            const trimmed = s.trim();
            if (!trimmed) return '';
            const first = trimmed[0].toUpperCase();
            const rest = trimmed.slice(1);
            const withBoost = /[.!?]$/.test(rest) ? `${first}${rest}` : `${first}${rest}.`;
            return withBoost.replace(/\bvery\s+/gi, '').replace(/\bsome\s+/gi, 'a few ');
        })
        .filter(Boolean)
        .join(' ');
    return reworded;
}

async function fakeFactCheck(text: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 300));
    return `${text} [verify: source needed]`;
}

export type AiResult =
    | { kind: 'success' }
    | { kind: 'no-selection' }
    | { kind: 'empty-selection' }
    | { kind: 'no-changes' }
    | { kind: 'unsupported-schema' };

export async function aiRephrase(
    editor: Editor,
    author: AiAuthor = DEFAULT_AI,
): Promise<AiResult> {
    const { from, to } = editor.state.selection;
    if (from === to) return { kind: 'no-selection' };
    const original = editor.state.doc.textBetween(from, to, ' ');
    if (!original.trim()) return { kind: 'empty-selection' };
    const replacement = await fakeRephrase(original);
    if (replacement === original) return { kind: 'no-changes' };
    return applyAiSuggestion(editor, from, to, replacement, author);
}

export async function aiFactCheck(
    editor: Editor,
    author: AiAuthor = DEFAULT_AI,
): Promise<AiResult> {
    const { from, to } = editor.state.selection;
    if (from === to) return { kind: 'no-selection' };
    const original = editor.state.doc.textBetween(from, to, ' ');
    const annotated = await fakeFactCheck(original);
    return applyAiSuggestion(editor, from, to, annotated, author);
}

function applyAiSuggestion(
    editor: Editor,
    from: number,
    to: number,
    replacement: string,
    author: AiAuthor,
): AiResult {
    const insertionType = editor.schema.marks.insertion;
    const deletionType = editor.schema.marks.deletion;
    if (!insertionType || !deletionType)
        return { kind: 'unsupported-schema' };

    const id = `ai-${makeId()}`;
    const attrs = {
        suggestionId: id,
        authorId: author.id,
        authorName: author.name,
        authorColor: author.color,
        timestamp: Date.now(),
    };

    const tr = editor.state.tr;
    tr.addMark(from, to, deletionType.create(attrs));
    tr.insert(to, editor.schema.text(replacement, [insertionType.create(attrs)]));
    tr.setMeta(META_SKIP, true);
    editor.view.dispatch(tr);

    return { kind: 'success' };
}
