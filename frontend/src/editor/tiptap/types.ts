import type { CollabBundle } from '@/editor/collab/yDoc';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';
import type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';
export type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';

export interface EditorViewProps {
  collab: CollabBundle
  glossaryEntries: GlossaryEntry[]
  onActiveCommentChange: (commentId: string | null) => void
  onCreateComment: (commentId: string, originalQuote: string) => void
}

export const EMPTY_SLASH: SlashTriggerInfo = { active: false, query: '', coords: null, range: null };
