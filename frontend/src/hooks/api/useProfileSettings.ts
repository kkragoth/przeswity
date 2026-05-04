import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { meGetOptions, mePatchMutation, meGetQueryKey } from '@/api/generated/@tanstack/react-query.gen';
import type { PatchMeBody } from '@/api/generated/types.gen';
import { useInvalidate } from '@/hooks/api/cache/useInvalidate';

export function useProfileSettings() {
    const invalidateMe = useInvalidate(meGetQueryKey);
    const { data: me } = useQuery({
        ...meGetOptions(),
    });

    const [values, setValues] = useState({ name: '', color: '#888888', image: '' });
    useEffect(() => {
        if (!me) return;
        setValues({ name: me.name, color: me.color, image: me.image ?? '' });
    }, [me]);

    const mutation = useMutation({
        ...mePatchMutation(),
        onSuccess: async () => {
            await invalidateMe();
        },
    });

    const submit = () => {
        const body: PatchMeBody = {
            name: values.name,
            color: values.color,
            image: values.image.length > 0 ? values.image : null,
        };
        return mutation.mutateAsync({ body });
    };

    const isDirty = useMemo(() => {
        if (!me) return false;
        return values.name !== me.name || values.color !== me.color || values.image !== (me.image ?? '');
    }, [me, values]);

    return {
        me,
        values,
        setField: (name: 'name' | 'color' | 'image', value: string) => setValues((prev) => ({ ...prev, [name]: value })),
        save: submit,
        isSaving: mutation.isPending,
        isDirty,
    };
}
