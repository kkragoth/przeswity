import { CommentFilters } from './CommentFilters';

interface CommentsSidebarHeaderProps {
    openCount: number
    allAuthors: string[]
}

export function CommentsSidebarHeader({ openCount, allAuthors }: CommentsSidebarHeaderProps) {
    return <CommentFilters totalOpen={openCount} allAuthors={allAuthors} />;
}
