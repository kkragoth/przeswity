// Pure predicates only. HTTP errors live in the router layer.

export const BOOK_STAGES = [
    'translation',
    'editing',
    'authorization',
    'proofreading',
    'applying_changes',
    'typesetting',
    'post_typeset_proof',
    'finalization',
] as const;

export const PROGRESS_MODES = ['auto', 'manual'] as const;

export type BookStage = typeof BOOK_STAGES[number];
export type ProgressMode = typeof PROGRESS_MODES[number];

const ALLOWED_NEXT: Record<BookStage, readonly BookStage[]> = {
    translation: ['editing'],
    editing: ['authorization', 'proofreading'],
    authorization: ['proofreading', 'editing'],
    proofreading: ['applying_changes', 'editing'],
    applying_changes: ['typesetting', 'proofreading'],
    typesetting: ['post_typeset_proof'],
    post_typeset_proof: ['finalization', 'applying_changes'],
    finalization: [],
};

export function isBookStage(value: string): value is BookStage {
    return (BOOK_STAGES as readonly string[]).includes(value);
}

export function canTransitionStage(from: BookStage, to: BookStage): boolean {
    if (from === to) return true;
    return ALLOWED_NEXT[from].includes(to);
}

export function isValidProgress(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 100;
}
