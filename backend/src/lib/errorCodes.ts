// Centralised error codes consumed by AppError / ZodError middleware. The frontend's
// i18n keys mirror these strings — keep both sides in lockstep when adding entries.
// Const enum so call sites get compile-time typo checking without runtime overhead.
export const ErrorCode = {
    Internal: 'errors.internal',
    Validation: 'errors.validation',
    ValidationEmpty: 'errors.validation.empty',

    AuthUnauthenticated: 'errors.auth.unauthenticated',
    AuthForbidden: 'errors.auth.forbidden',

    BookNotFound: 'errors.book.notFound',
    BookForbidden: 'errors.book.forbidden',
    BookStageInvalid: 'errors.book.stage.invalid',
    BookStageTransitionForbidden: 'errors.book.stage.transitionForbidden',
    BookProgressInvalid: 'errors.book.progress.invalid',

    AssignmentNotFound: 'errors.assignment.notFound',
    AssignmentUnknownUsers: 'errors.assignment.unknownUsers',

    CommentNotFound: 'errors.comment.notFound',
    CommentForbidden: 'errors.comment.forbidden',

    SnapshotNotFound: 'errors.snapshot.notFound',

    UserNotFound: 'errors.user.notFound',
    UserDuplicate: 'errors.user.duplicate',

    PdfNoFile: 'errors.pdf.noFile',
    PdfUnsupportedMediaType: 'errors.pdf.unsupportedMediaType',

    PresenceDisabled: 'errors.presence.disabled',
} as const;

export type ErrorCodeValue = typeof ErrorCode[keyof typeof ErrorCode];
