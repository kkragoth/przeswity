import { type Participant } from '../store/commentsSelectors';
import { CommentFilters } from './CommentFilters';

interface CommentsSidebarHeaderProps {
    openCount: number
    participants: Participant[]
}

export function CommentsSidebarHeader({ openCount, participants }: CommentsSidebarHeaderProps) {
    return <CommentFilters totalOpen={openCount} participants={participants} />;
}
