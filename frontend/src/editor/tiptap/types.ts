import type { Editor } from '@tiptap/react';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';
import type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';
export type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';

export interface EditorViewProps {
  collab: CollabBundle
  user: User
  suggestingMode: boolean
  suggestingForced?: boolean
  onSuggestingModeChange?: (mode: boolean) => void
  activeCommentId: string | null
  glossaryEntries: GlossaryEntry[]
  onActiveCommentChange: (commentId: string | null) => void
  onCreateComment: (commentId: string, originalQuote: string) => void
  onEditorReady: (editor: Editor) => void
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

export const EMPTY_SLASH: SlashTriggerInfo = { active: false, query: '', coords: null, range: null };
