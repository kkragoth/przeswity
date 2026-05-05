import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { Insertion, Deletion } from '@/editor/suggestions/trackChangeMarks';
import { DiffBlockAttr } from '@/editor/suggestions/blockDiffAttribute';
import { Comment } from '@/editor/comments/CommentMark';
import { Highlight } from '@/editor/tiptap/extensions/Highlight';
import {
    A4_PAGE_HEIGHT_PX,
    A4_PAGE_WIDTH_PX,
    A4_MARGIN_PX,
    PAGE_GAP_BORDER_COLOR,
    PAGE_BREAK_BACKGROUND,
} from '@/editor/tiptap/constants';

const READ_ONLY_PAGE_GAP_PX = 32;
const READ_ONLY_CONTENT_MARGIN_TOP_PX = 8;
const READ_ONLY_CONTENT_MARGIN_BOTTOM_PX = 8;

export const READ_ONLY_EXTENSIONS = [
    StarterKit.configure({ undoRedo: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Comment,
    Insertion,
    Deletion,
    DiffBlockAttr,
    Highlight,
    PaginationPlus.configure({
        pageHeight: A4_PAGE_HEIGHT_PX,
        pageWidth: A4_PAGE_WIDTH_PX,
        marginTop: A4_MARGIN_PX,
        marginBottom: A4_MARGIN_PX,
        marginLeft: A4_MARGIN_PX,
        marginRight: A4_MARGIN_PX,
        pageGap: READ_ONLY_PAGE_GAP_PX,
        contentMarginTop: READ_ONLY_CONTENT_MARGIN_TOP_PX,
        contentMarginBottom: READ_ONLY_CONTENT_MARGIN_BOTTOM_PX,
        pageGapBorderColor: PAGE_GAP_BORDER_COLOR,
        pageBreakBackground: PAGE_BREAK_BACKGROUND,
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '{page}',
    }),
] as unknown as AnyExtension[];
