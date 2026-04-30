import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { bookCreate } from '@/api/generated/services.gen';

export function useNewBookForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const mutation = useMutation({
        mutationFn: () => bookCreate({ body: { title, description, initialMarkdown, initialAssignments: [] } }),
    });

    return {
        values: { title, description, initialMarkdown },
        setField: {
            setTitle,
            setDescription,
            setInitialMarkdown,
        },
        submit: () => mutation.mutateAsync(),
        isSubmitting: mutation.isPending,
    };
}
