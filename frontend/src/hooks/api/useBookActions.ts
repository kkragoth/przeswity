import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
    bookPatchProgressMutation,
    bookPatchStageMutation,
} from '@/api/generated/@tanstack/react-query.gen';
import type { Book } from '@/api/generated/types.gen';
import { useInvalidateBooks } from '@/hooks/api/cache/useInvalidateBooks';

export function shouldCommitStage(current: Book['stage'], draft: Book['stage'] | undefined): boolean {
    return Boolean(draft && draft !== current);
}

export function shouldCommitProgress(current: number, draft: number | undefined): boolean {
    if (draft == null) return false;
    if (draft < 0 || draft > 100) return false;
    return draft !== current;
}

export function useBookActions(initialBooks: Array<{ id: string; stage: Book['stage']; progress: number }>) {
    const invalidateBooks = useInvalidateBooks();
    const [stageDraft, setStageDraft] = useState<Record<string, Book['stage']>>({});
    const [progressDraft, setProgressDraft] = useState<Record<string, number>>({});
    const byId = new Map(initialBooks.map((b) => [b.id, b]));

    const stageMutation = useMutation({
        ...bookPatchStageMutation(),
        onSuccess: async () => {
            await invalidateBooks();
        },
    });
    const progressMutation = useMutation({
        ...bookPatchProgressMutation(),
        onSuccess: async () => {
            await invalidateBooks();
        },
    });

    const commitStage = async (bookId: string) => {
        const base = byId.get(bookId);
        const next = stageDraft[bookId];
        if (!base || !shouldCommitStage(base.stage, next)) return;
        await stageMutation.mutateAsync({ path: { id: bookId }, body: { stage: next } });
    };

    const commitProgress = async (bookId: string) => {
        const base = byId.get(bookId);
        const next = progressDraft[bookId];
        if (!base || !shouldCommitProgress(base.progress, next)) return;
        await progressMutation.mutateAsync({ path: { id: bookId }, body: { progress: next, mode: 'manual' } });
    };

    return {
        stageDraft,
        setStageDraft,
        commitStage,
        progressDraft,
        setProgressDraft,
        commitProgress,
        isPending: (bookId: string) => stageMutation.isPending || progressMutation.isPending || Boolean(stageDraft[bookId]) || Boolean(progressDraft[bookId]),
    };
}
