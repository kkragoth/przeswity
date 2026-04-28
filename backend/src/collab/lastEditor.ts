export const lastEditorByBook = new Map<string, string>();

export const attributionExtension = {
    async onChange({ documentName, context }: { documentName: string; context: any }) {
        if (!context?.user?.id) return;
        const bookId = documentName.replace(/^book:/, '');
        lastEditorByBook.set(bookId, context.user.id);
    },
};
