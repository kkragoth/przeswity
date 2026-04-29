import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronDown, ChevronRight, BookOpen, Settings, LogOut, FileText } from 'lucide-react';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { saveAs } from 'file-saver';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Avatar } from '../shell/Avatar';
import { RoleBadge } from '@/components/RoleBadge';
import { authClient } from '@/auth/client';
import type { Editor } from '@tiptap/react';
import type { User } from '../identity/types';
import type { RolePermissions } from '@/editor/identity/types';
import { editorToMarkdown } from '@/editor/io/markdown';
import { editorToDocxBlob } from '@/editor/io/docx';
import { TEMPLATES } from '@/editor/workflow/templates';

const MAMMOTH_STYLE_MAP = [
    "p[style-name='Heading 1'] => h1:fresh",
    "p[style-name='Heading 2'] => h2:fresh",
    "p[style-name='Heading 3'] => h3:fresh",
    "p[style-name='Quote'] => blockquote > p:fresh",
    "p[style-name='List Bullet'] => ul > li:fresh",
    "p[style-name='List Number'] => ol > li:fresh",
    "b => strong",
    "i => em",
    "u => u",
];

export interface TopBarProps {
    user: User;
    bookTitle: string;
    editor: Editor | null;
    perms: RolePermissions;
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

interface BookTitleMenuProps {
    bookTitle: string;
    editor: Editor | null;
    perms: RolePermissions;
    onToast: (msg: string, kind?: 'info' | 'success' | 'error') => void;
}

function BookTitleMenu({ bookTitle, editor, perms, onToast }: BookTitleMenuProps) {
    const { t } = useTranslation('editor');
    const fileRef = useRef<HTMLInputElement>(null);
    const [importKind, setImportKind] = useState<'docx' | 'md'>('docx');

    const startImport = (kind: 'docx' | 'md') => {
        if (!fileRef.current) return;
        setImportKind(kind);
        fileRef.current.accept = kind === 'docx' ? '.docx' : '.md,.markdown,.txt';
        setTimeout(() => fileRef.current?.click(), 0);
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!window.confirm(`Importing "${file.name}" will replace the current document.\n\nProceed?`)) return;
        try {
            onToast('Importing…', 'info');
            let html: string;
            if (/\.docx$/i.test(file.name)) {
                const buf = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: buf }, { styleMap: MAMMOTH_STYLE_MAP });
                html = result.value;
            } else {
                html = await marked.parse(await file.text());
            }
            editor!.commands.setContent(html, { emitUpdate: true });
            onToast(`Imported ${file.name}`, 'success');
        } catch (err) {
            onToast(`Import failed: ${(err as Error).message}`, 'error');
        }
    };

    const applyTemplate = (id: string) => {
        const tmpl = TEMPLATES.find((x) => x.id === id);
        if (!tmpl) return;
        if (!window.confirm(`Apply template "${tmpl.name}"?\n\nThis replaces the current document.`)) return;
        editor!.commands.setContent(tmpl.content as never, { emitUpdate: true });
        onToast(`Loaded template: ${tmpl.name}`, 'success');
    };

    if (!editor || (!perms.canEdit && !perms.canExport)) {
        return <span className="topbar-book-title" title={bookTitle}>{bookTitle}</span>;
    }

    return (
        <>
            <DropdownMenuPrimitive.Root>
                <DropdownMenuPrimitive.Trigger asChild>
                    <button type="button" className="topbar-book-title" title={bookTitle}>
                        {bookTitle}
                        <ChevronDown size={11} aria-hidden="true" style={{ flexShrink: 0 }} />
                    </button>
                </DropdownMenuPrimitive.Trigger>
                <DropdownMenuPrimitive.Portal>
                    <DropdownMenuPrimitive.Content align="start" sideOffset={6} className="topbar-dropdown-content">
                        <DropdownMenuPrimitive.Sub>
                            <DropdownMenuPrimitive.SubTrigger className="topbar-dropdown-item topbar-dropdown-subtrigger">
                                <FileText size={14} />{t('toolbar.fileMenu')}
                                <ChevronRight size={12} className="topbar-dropdown-subtrigger-chevron" aria-hidden="true" />
                            </DropdownMenuPrimitive.SubTrigger>
                            <DropdownMenuPrimitive.Portal>
                                <DropdownMenuPrimitive.SubContent className="topbar-dropdown-content" sideOffset={4}>
                                    {perms.canEdit && (
                                        <>
                                            <div className="topbar-dropdown-label">{t('toolbar.import')}</div>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => startImport('docx')}>
                                                DOCX (.docx)
                                            </DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => startImport('md')}>
                                                Markdown (.md)
                                            </DropdownMenuPrimitive.Item>
                                        </>
                                    )}
                                    {perms.canEdit && perms.canExport && <div className="topbar-dropdown-sep" />}
                                    {perms.canExport && (
                                        <>
                                            <div className="topbar-dropdown-label">{t('toolbar.export')}</div>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => {
                                                const md = editorToMarkdown(editor);
                                                saveAs(new Blob([md], { type: 'text/markdown;charset=utf-8' }), 'document.md');
                                            }}>
                                                Markdown (.md)
                                            </DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => void editorToDocxBlob(editor, { acceptSuggestions: true }).then((blob) => saveAs(blob, 'document-clean.docx'))}>
                                                DOCX — clean
                                            </DropdownMenuPrimitive.Item>
                                            <DropdownMenuPrimitive.Item className="topbar-dropdown-item" onSelect={() => void editorToDocxBlob(editor, { acceptSuggestions: false }).then((blob) => saveAs(blob, 'document-with-tracks.docx'))}>
                                                DOCX — with track changes
                                            </DropdownMenuPrimitive.Item>
                                        </>
                                    )}
                                    {perms.canEdit && (
                                        <>
                                            <div className="topbar-dropdown-sep" />
                                            <div className="topbar-dropdown-label">{t('toolbar.templates')}</div>
                                            {TEMPLATES.map((tmpl) => (
                                                <DropdownMenuPrimitive.Item key={tmpl.id} className="topbar-dropdown-item" onSelect={() => applyTemplate(tmpl.id)}>
                                                    {tmpl.name}
                                                </DropdownMenuPrimitive.Item>
                                            ))}
                                        </>
                                    )}
                                </DropdownMenuPrimitive.SubContent>
                            </DropdownMenuPrimitive.Portal>
                        </DropdownMenuPrimitive.Sub>
                    </DropdownMenuPrimitive.Content>
                </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
            <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => void onFile(e)}
                data-import-kind={importKind}
            />
        </>
    );
}

function UserMenu({ user }: { user: User }) {
    const { t } = useTranslation('editor');
    const navigate = useNavigate();
    const { data: session } = authClient.useSession();
    const email = session?.user?.email ?? '';

    const handleLogout = async () => {
        await authClient.signOut();
        void navigate({ to: '/login', search: {} as never });
    };

    return (
        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
                <button type="button" className="topbar-avatar-trigger" aria-label={user.name}>
                    <RoleBadge role={user.role} />
                    <Avatar name={user.name} color={user.color} size="sm" />
                </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content align="end" sideOffset={6} className="topbar-dropdown-content">
                    <div className="topbar-dropdown-header">
                        <div className="topbar-dropdown-name">{user.name}</div>
                        {email && <div className="topbar-dropdown-email">{email}</div>}
                    </div>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/books" className="topbar-dropdown-item">
                            <BookOpen size={14} />{t('topbar.menuMyBooks')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/settings" className="topbar-dropdown-item">
                            <Settings size={14} />{t('topbar.menuSettings')}
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <div className="topbar-dropdown-sep" />
                    <DropdownMenuPrimitive.Item asChild>
                        <button
                            type="button"
                            className="topbar-dropdown-item topbar-dropdown-item--danger"
                            onClick={() => void handleLogout()}
                        >
                            <LogOut size={14} />{t('topbar.menuLogout')}
                        </button>
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
    );
}

export function TopBar({ user, bookTitle, editor, perms, onToast }: TopBarProps) {
    const { t } = useTranslation('editor');
    return (
        <header className="topbar">
            <Link to="/books" className="topbar-logo" aria-label="Prześwity">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <rect x="3" y="4" width="3" height="12" rx="1" fill="currentColor" />
                    <rect x="8.5" y="4" width="2" height="12" rx="0.5" fill="currentColor" opacity="0.6" />
                    <rect x="13" y="4" width="3" height="12" rx="1" fill="currentColor" opacity="0.35" />
                </svg>
            </Link>
            <nav className="topbar-breadcrumb" aria-label="breadcrumb">
                <Link to="/books" className="topbar-breadcrumb-link">{t('topbar.booksLink')}</Link>
                <ChevronRight size={12} className="topbar-breadcrumb-sep" aria-hidden="true" />
                <BookTitleMenu bookTitle={bookTitle} editor={editor} perms={perms} onToast={onToast} />
            </nav>
            <div className="topbar-spacer" />
            <div className="topbar-right">
                <UserMenu user={user} />
            </div>
        </header>
    );
}
