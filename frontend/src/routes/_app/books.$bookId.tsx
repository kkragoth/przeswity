import '@/editor/styles.css';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';
import { z } from 'zod';
import { EditorSkeleton } from '@/containers/editor/layout/EditorSkeleton';
import {
    useEditorViewStore,
    EditorViewKind,
    DiffSideKind,
    type DiffSide,
} from '@/containers/editor/session/editorViewStore';

const BookEditorPage = lazy(async () => import('@/containers/books/BookEditorPage').then((m) => ({ default: m.BookEditorPage })));

const CURRENT_KEYWORD = 'current';

const searchSchema = z.object({
    left: z.string().optional(),
    right: z.string().optional(),
}).catch({});

export const Route = createFileRoute('/_app/books/$bookId')({
    staticData: { immersive: true },
    validateSearch: searchSchema,
    component: BookDetailRoute,
});

function parseSide(value: string | undefined): DiffSide | null {
    if (!value) return null;
    if (value === CURRENT_KEYWORD) return { kind: DiffSideKind.Current };
    return { kind: DiffSideKind.Snapshot, id: value };
}

/**
 * Syncs URL search params → editorViewStore on initial load (deep-link support).
 * Ongoing navigation keeps them in sync via useVersionNavigation.
 */
function BookDetailRoute() {
    const { bookId } = Route.useParams();
    const { left, right } = Route.useSearch();
    const openCompare = useEditorViewStore((s) => s.openCompare);
    const closeLive = useEditorViewStore((s) => s.closeLive);
    const viewKind = useEditorViewStore((s) => s.view.kind);

    useEffect(() => {
        const leftSide = parseSide(left);
        const rightSide = parseSide(right);
        if (leftSide && rightSide) {
            openCompare(leftSide, rightSide);
        } else if (viewKind === EditorViewKind.VersionHistory) {
            closeLive();
        }
    // Run only when URL params change, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [left, right]);

    return (
        <Suspense fallback={<EditorSkeleton />}>
            <BookEditorPage bookId={bookId} />
        </Suspense>
    );
}
