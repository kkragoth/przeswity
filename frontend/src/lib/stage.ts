import type { Book } from '@/api/generated/types.gen';

// Enum mirrors the generated Book['stage'] literal union.
// Use BookStage.* instead of raw string literals everywhere.
export enum BookStage {
    Translation = 'translation',
    Editing = 'editing',
    Authorization = 'authorization',
    Proofreading = 'proofreading',
    ApplyingChanges = 'applying_changes',
    Typesetting = 'typesetting',
    PostTypesetProof = 'post_typeset_proof',
    Finalization = 'finalization',
}

/** Ordered list of stages; index 0 is the earliest. */
export const BOOK_STAGES_ORDER: BookStage[] = [
    BookStage.Translation,
    BookStage.Editing,
    BookStage.Authorization,
    BookStage.Proofreading,
    BookStage.ApplyingChanges,
    BookStage.Typesetting,
    BookStage.PostTypesetProof,
    BookStage.Finalization,
];

/** Returns the stages a book can transition to from the given stage. */
export function allowedNextStages(stage: Book['stage']): Book['stage'][] {
    const map: Record<Book['stage'], Book['stage'][]> = {
        translation:      ['editing'],
        editing:          ['authorization', 'proofreading'],
        authorization:    ['proofreading', 'editing'],
        proofreading:     ['applying_changes', 'editing'],
        applying_changes: ['typesetting', 'proofreading'],
        typesetting:      ['post_typeset_proof'],
        post_typeset_proof: ['finalization', 'applying_changes'],
        finalization:     [],
    };
    return map[stage];
}
