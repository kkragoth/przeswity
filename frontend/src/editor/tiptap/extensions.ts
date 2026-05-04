import { Extension, type AnyExtension } from '@tiptap/core';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { peerCursorBuilder, peerSelectionBuilder } from '@/editor/collab/peerCursor';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { PaginationPlus } from 'tiptap-pagination-plus';
import type { HeaderClickEvent, FooterClickEvent } from 'tiptap-pagination-plus';

import { Comment } from '@/editor/comments/CommentMark';
import { Insertion, Deletion } from '@/editor/suggestions/trackChangeMarks';
import { DiffBlockAttr } from '@/editor/suggestions/blockDiffAttribute';
import { SuggestionMode } from '@/editor/suggestions/SuggestionMode';
import { SmartPaste } from '@/editor/tiptap/extensions/SmartPaste';
import { SmartTypography } from '@/editor/tiptap/extensions/SmartTypography';
import { Highlight } from '@/editor/tiptap/extensions/Highlight';
import { FindReplace } from '@/editor/tiptap/find/FindReplace';
import { Footnote } from '@/editor/tiptap/extensions/Footnote';
import { TableOfContents } from '@/editor/tiptap/extensions/TableOfContents';
import { SlashCommand } from '@/editor/tiptap/slash/SlashCommand';
import type { SlashTriggerInfo } from '@/editor/tiptap/slash/SlashCommand';
import { GlossaryHighlight } from '@/editor/glossary/GlossaryHighlight';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';
import type { CollabBundle } from '@/editor/collab/yDoc';
import type { User } from '@/editor/identity/types';
import {
    A4_PAGE_HEIGHT_PX,
    A4_PAGE_WIDTH_PX,
    A4_MARGIN_PX,
    PAGE_GAP_BORDER_COLOR,
    PAGE_BREAK_BACKGROUND,
} from './constants';

const A4_PAGE = {
    pageHeight: A4_PAGE_HEIGHT_PX,
    pageWidth: A4_PAGE_WIDTH_PX,
    marginTop: A4_MARGIN_PX,
    marginBottom: A4_MARGIN_PX,
    marginLeft: A4_MARGIN_PX,
    marginRight: A4_MARGIN_PX,
} as const;

export interface ExtensionsConfig {
    collab: CollabBundle;
    user: User;
    onCommentClick: (id: string) => void;
    onSlashTrigger: (info: SlashTriggerInfo) => void;
    getSuggestingEnabled: () => boolean;
    getSuggestionAuthor: () => { id: string; name: string; color: string };
    getGlossaryEntries: () => GlossaryEntry[];
    getOnHeaderClick?: () => HeaderClickEvent | undefined;
    getOnFooterClick?: () => FooterClickEvent | undefined;
}

export function buildExtensions(config: ExtensionsConfig): AnyExtension[] {
    const { collab, user } = config;
    return [
        StarterKit.configure({
            undoRedo: false,
            link: { openOnClick: false },
        }),
        CharacterCount,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Collaboration.configure({ document: collab.doc }),
        // @tiptap/extension-collaboration-cursor@3.0.0 imports yCursorPlugin from y-prosemirror,
        // but @tiptap/extension-collaboration@3.22.5 registers ySyncPlugin via @tiptap/y-tiptap —
        // the keys are different instances, so the cursor plugin crashes on init.
        // Fix: use yCursorPlugin directly from @tiptap/y-tiptap.
        Extension.create({
            name: 'collaborationCursor',
            addProseMirrorPlugins() {
                // awareness is always defined — we never pass awareness:null to HocuspocusProvider
                const awareness = collab.provider.awareness!;
                awareness.setLocalStateField('user', {
                    name: user.name,
                    color: user.color,
                    userId: user.id,
                    lastActiveAt: Date.now(),
                });
                return [yCursorPlugin(awareness, { cursorBuilder: peerCursorBuilder, selectionBuilder: peerSelectionBuilder })];
            },
        }),
        Comment.configure({ onCommentClick: config.onCommentClick }),
        Insertion,
        Deletion,
        DiffBlockAttr,
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
        PaginationPlus.configure({
            ...A4_PAGE,
            pageGap: 32,
            contentMarginTop: 8,
            contentMarginBottom: 8,
            pageGapBorderColor: PAGE_GAP_BORDER_COLOR,
            pageBreakBackground: PAGE_BREAK_BACKGROUND,
            headerLeft: '',
            headerRight: '',
            footerLeft: '',
            footerRight: '{page}',
            onHeaderClick: (params) => config.getOnHeaderClick?.()?.(params),
            onFooterClick: (params) => config.getOnFooterClick?.()?.(params),
        }),
    ] as unknown as AnyExtension[];
}
