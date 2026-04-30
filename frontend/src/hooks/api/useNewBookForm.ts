import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { bookCreateMutation } from '@/api/generated/@tanstack/react-query.gen';

export function useNewBookForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [initialMarkdown, setInitialMarkdown] = useState('');
    const mutation = useMutation(bookCreateMutation());

    return {
        values: { title, description, initialMarkdown },
        setField: {
            setTitle,
            setDescription,
            setInitialMarkdown,
        },
        submit: () => mutation.mutateAsync({ body: { title, description, initialMarkdown, initialAssignments: [] } }),
        isSubmitting: mutation.isPending,
    };
}
