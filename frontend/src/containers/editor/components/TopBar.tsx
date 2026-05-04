import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { Editor } from '@tiptap/react';

import { BookTitleMenu } from '@/containers/editor/components/BookTitleMenu';
import { UserMenu } from '@/containers/editor/components/UserMenu';

export interface TopBarProps {
    bookTitle: string;
    editor: Editor | null;
}

export function TopBar({ bookTitle, editor }: TopBarProps) {
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
                <BookTitleMenu bookTitle={bookTitle} editor={editor} />
            </nav>
            <div className="topbar-spacer" />
            <div className="topbar-right">
                <UserMenu />
            </div>
        </header>
    );
}
