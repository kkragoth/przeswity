import { CommentThreadCard } from '@/containers/editor/components/comments/CommentThreadCard';

interface OpenCommentListProps {
    threadIds: string[];
}

export function OpenCommentList({ threadIds }: OpenCommentListProps) {
    return (
        <>
            {threadIds.map((id) => (
                <div key={id} data-thread-id={id}>
                    <CommentThreadCard threadId={id} />
                </div>
            ))}
        </>
    );
}
