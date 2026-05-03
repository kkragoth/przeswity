import type { onChangePayload, Extension } from '@hocuspocus/server';
import type { AuthUser } from '../auth/session.js';

export const lastEditorByBook = new Map<string, string>();

export const attributionExtension: Pick<Extension, 'onChange'> = {
    async onChange({ documentName, context }: onChangePayload) {
        const userId = (context as { user?: Partial<AuthUser> } | null)?.user?.id;
        if (!userId) return;
        const bookId = documentName.replace(/^book:/, '');
        lastEditorByBook.set(bookId, userId);
    },
};
