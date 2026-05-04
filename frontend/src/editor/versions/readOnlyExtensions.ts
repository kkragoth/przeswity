import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Insertion, Deletion } from '@/editor/suggestions/TrackChange';
import { DiffBlockAttr } from '@/editor/suggestions/DiffBlockAttr';
import { Comment } from '@/editor/comments/CommentMark';
import { Highlight } from '@/editor/tiptap/extensions/Highlight';

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
];
