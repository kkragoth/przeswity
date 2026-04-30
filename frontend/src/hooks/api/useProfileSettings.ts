import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { meGet, mePatch } from '@/api/generated/services.gen';
import type { PatchMeBody } from '@/api/generated/types.gen';

const ME_KEY = ['me'] as const;

export function useProfileSettings() {
    const queryClient = useQueryClient();
    const { data: me } = useQuery({
        queryKey: ME_KEY,
        queryFn: async () => (await meGet()).data,
    });

    const [values, setValues] = useState({ name: '', color: '#888888', image: '' });
    useEffect(() => {
        if (!me) return;
        setValues({ name: me.name, color: me.color, image: me.image ?? '' });
    }, [me]);

    const mutation = useMutation({
        mutationFn: () => {
            const body: PatchMeBody = {
                name: values.name,
                color: values.color,
                image: values.image.length > 0 ? values.image : null,
            };
            return mePatch({ body });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ME_KEY });
        },
    });

    const isDirty = useMemo(() => {
        if (!me) return false;
        return values.name !== me.name || values.color !== me.color || values.image !== (me.image ?? '');
    }, [me, values]);

    return {
        me,
        values,
        setField: (name: 'name' | 'color' | 'image', value: string) => setValues((prev) => ({ ...prev, [name]: value })),
        save: () => mutation.mutateAsync(),
        isSaving: mutation.isPending,
        isDirty,
    };
}
