import { CommentThreadCard } from '@/containers/editor/components/comments/CommentThreadCard';

interface OpenCommentListProps {
    threadIds: string[];
    cardsRef: React.RefObject<Record<string, HTMLDivElement | null>>;
}

export function OpenCommentList({ threadIds, cardsRef }: OpenCommentListProps) {
    return (
        <>
            {threadIds.map((id) => (
                <div
                    key={id}
                    ref={(el) => {
                        cardsRef.current[id] = el;
                    }}
                >
                    <CommentThreadCard threadId={id} />
                </div>
            ))}
        </>
    );
}
