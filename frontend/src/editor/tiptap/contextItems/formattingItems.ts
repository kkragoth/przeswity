// TODO (Phase 41 follow-up): replace window.prompt calls below with an injected
// async callback from the host component that opens LinkPromptDialog. The TipTap
// extension callback system is synchronous so this requires host-side wiring.
import type { ContextMenuItem } from '@/editor/shell/ContextMenu';
import { ROLE_PERMISSIONS } from '@/editor/identity/types';
import type { BuildContextArgs, MarkSet } from '@/editor/tiptap/contextItems/types';

function linkItems(args: BuildContextArgs, marks: MarkSet): ContextMenuItem[] {
    const perms = ROLE_PERMISSIONS[args.user.role];
    if (marks.linkMark) {
        const href = marks.linkMark.attrs.href as string;
        const items: ContextMenuItem[] = [{ label: '', separator: true }, { label: 'Open link', icon: '↗', action: () => window.open(href, '_blank', 'noopener') }];
        if (perms.canEdit) {
            items.push(
                {
                    label: 'Edit link',
                    icon: '✎',
                    action: () => {
                        const next = window.prompt('Link URL', href);
                        if (next === null) return;
                        if (next === '') args.editor.chain().focus().unsetLink().run();
                        else args.editor.chain().focus().extendMarkRange('link').setLink({ href: next }).run();
                    },
                },
                { label: 'Remove link', icon: '⊘', danger: true, action: () => args.editor.chain().focus().extendMarkRange('link').unsetLink().run() },
            );
        }
        return items;
    }
    if (!args.hasSelection || !perms.canEdit) return [];
    return [{ label: '', separator: true }, { label: 'Add link', shortcut: '⌘K', icon: '🔗', action: () => { const url = window.prompt('Link URL', 'https://'); if (url) args.editor.chain().focus().setLink({ href: url }).run(); } }];
}

function formatItems(args: BuildContextArgs): ContextMenuItem[] {
    const perms = ROLE_PERMISSIONS[args.user.role];
    if (!args.hasSelection || (!perms.canEdit && !perms.canSuggest)) return [];
    const e = args.editor;
    const styleAction = (cmd: () => void, active: boolean, label: string, icon: string): ContextMenuItem => ({ label, icon: active ? '●' : icon, action: cmd });
    return [
        { label: '', separator: true },
        { label: 'Bold', shortcut: '⌘B', icon: e.isActive('bold') ? '●' : '○', action: () => e.chain().focus().toggleBold().run() },
        { label: 'Italic', shortcut: '⌘I', icon: e.isActive('italic') ? '●' : '○', action: () => e.chain().focus().toggleItalic().run() },
        { label: 'Underline', shortcut: '⌘U', icon: e.isActive('underline') ? '●' : '○', action: () => e.chain().focus().toggleUnderline().run() },
        { label: '', separator: true },
        styleAction(() => e.chain().focus().setParagraph().run(), e.isActive('paragraph'), 'Style: Body', '¶'),
        styleAction(() => e.chain().focus().setHeading({ level: 1 }).run(), e.isActive('heading', { level: 1 }), 'Style: Heading 1', 'H₁'),
        styleAction(() => e.chain().focus().setHeading({ level: 2 }).run(), e.isActive('heading', { level: 2 }), 'Style: Heading 2', 'H₂'),
        styleAction(() => e.chain().focus().setHeading({ level: 3 }).run(), e.isActive('heading', { level: 3 }), 'Style: Heading 3', 'H₃'),
        styleAction(() => e.chain().focus().setBlockquote().run(), e.isActive('blockquote'), 'Style: Quote', '❝'),
    ];
}

function lookupItems(args: BuildContextArgs): ContextMenuItem[] {
    if (!args.hasSelection) return [];
    const term = args.editor.state.doc.textBetween(args.editor.state.selection.from, args.editor.state.selection.to, ' ').slice(0, 200);
    if (!term) return [];
    const enc = encodeURIComponent(term);
    const open = (url: string) => () => window.open(url, '_blank', 'noopener');
    return [
        { label: '', separator: true },
        { label: 'Define', icon: '📖', action: open(`https://www.merriam-webster.com/dictionary/${enc}`) },
        { label: 'Synonyms', icon: '⇆', action: open(`https://www.merriam-webster.com/thesaurus/${enc}`) },
        { label: 'Translate', icon: '🌐', action: open(`https://translate.google.com/?sl=auto&tl=en&text=${enc}&op=translate`) },
        { label: 'Search Google', icon: '🔎', action: open(`https://www.google.com/search?q=${enc}`) },
    ];
}

export function formattingItems(args: BuildContextArgs, marks: MarkSet): ContextMenuItem[] {
    return [...linkItems(args, marks), ...formatItems(args), ...lookupItems(args)];
}
