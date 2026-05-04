import { useTranslation } from 'react-i18next';
import { CommentFilters } from './CommentFilters';

interface CommentsSidebarHeaderProps {
    openCount: number
    allAuthors: string[]
}

export function CommentsSidebarHeader({ openCount, allAuthors }: CommentsSidebarHeaderProps) {
    const { t } = useTranslation('editor');
    return (
        <>
            <div className="comments-header">
                <span className="sidebar-title sidebar-title-inline">
                    {t('comments.tabs.comments')}{' '}
                    <span className="comment-count-pill">{openCount}</span>
                </span>
            </div>
            <CommentFilters totalOpen={openCount} allAuthors={allAuthors} />
        </>
    );
}
