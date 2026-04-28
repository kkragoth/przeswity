import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

import { Comment } from '../comments/Comment';
import { Insertion, Deletion } from '../suggestions/TrackChange';
import { SuggestionMode } from '../suggestions/SuggestionMode';
import { SmartPaste } from './formatting/SmartPaste';
import { SmartTypography } from './formatting/SmartTypography';
import { Highlight } from './formatting/Highlight';
import { FindReplace } from './find/FindReplace';
import { Footnote } from './blocks/Footnote';
import { TableOfContents } from './blocks/Toc';
import { SlashCommand } from './slash/SlashCommand';
import type { SlashTriggerInfo } from './slash/SlashCommand';
import { GlossaryHighlight } from '../glossary/GlossaryHighlight';
import type { GlossaryEntry } from '../glossary/GlossaryHighlight';
import type { CollabBundle } from '../collab/yDoc';
import type { User } from '../identity/types';

export interface ExtensionsConfig {
  collab: CollabBundle
  user: User
  onCommentClick: (id: string) => void
  onSlashTrigger: (info: SlashTriggerInfo) => void
  getSuggestingEnabled: () => boolean
  getSuggestionAuthor: () => { id: string; name: string; color: string }
  getGlossaryEntries: () => GlossaryEntry[]
}

/**
 * Builds the full Tiptap extension list for the main editor. Each option
 * is a getter so it stays live without recreating the editor when the
 * caller's state changes.
 */
export function buildExtensions(config: ExtensionsConfig) {
    const { collab, user } = config;
    return [
        StarterKit.configure({ history: false }),
        Underline,
        Link.configure({ openOnClick: false }),
        CharacterCount,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Collaboration.configure({ document: collab.doc }),
        CollaborationCursor.configure({
            provider: collab.provider,
            user: { name: user.name, color: user.color },
        }),
        Comment.configure({ onCommentClick: config.onCommentClick }),
        Insertion,
        Deletion,
        SmartPaste,
        FindReplace,
        Footnote,
        Image.configure({ allowBase64: true, inline: false }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        SmartTypography,
        Highlight,
        TableOfContents,
        SlashCommand.configure({ onTrigger: config.onSlashTrigger }),
        GlossaryHighlight.configure({ getEntries: config.getGlossaryEntries }),
        SuggestionMode.configure({
            getEnabled: config.getSuggestingEnabled,
            getAuthor: config.getSuggestionAuthor,
        }),
    ];
}
