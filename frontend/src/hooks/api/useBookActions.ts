import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { bookPatchProgress, bookPatchStage } from '@/api/generated/services.gen';
import type { Book } from '@/api/generated/types.gen';

export function shouldCommitStage(current: Book['stage'], draft: Book['stage'] | undefined): boolean {
    return Boolean(draft && draft !== current);
}

export function shouldCommitProgress(current: number, draft: number | undefined): boolean {
    if (draft == null) return false;
    if (draft < 0 || draft > 100) return false;
    return draft !== current;
}

export function useBookActions(initialBooks: Array<{ id: string; stage: Book['stage']; progress: number }>) {
    const queryClient = useQueryClient();
    const [stageDraft, setStageDraft] = useState<Record<string, Book['stage']>>({});
    const [progressDraft, setProgressDraft] = useState<Record<string, number>>({});
    const byId = new Map(initialBooks.map((b) => [b.id, b]));

    const stageMutation = useMutation({
        mutationFn: ({ id, stage }: { id: string; stage: Book['stage'] }) => bookPatchStage({ path: { id }, body: { stage } }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        },
    });
    const progressMutation = useMutation({
        mutationFn: ({ id, progress }: { id: string; progress: number }) => bookPatchProgress({ path: { id }, body: { progress, mode: 'manual' } }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['books'] });
        },
    });

    const commitStage = async (bookId: string) => {
        const base = byId.get(bookId);
        const next = stageDraft[bookId];
        if (!base || !shouldCommitStage(base.stage, next)) return;
        await stageMutation.mutateAsync({ id: bookId, stage: next });
    };

    const commitProgress = async (bookId: string) => {
        const base = byId.get(bookId);
        const next = progressDraft[bookId];
        if (!base || !shouldCommitProgress(base.progress, next)) return;
        await progressMutation.mutateAsync({ id: bookId, progress: next });
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
