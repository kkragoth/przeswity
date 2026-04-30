import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authClient } from '@/auth/client';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof formSchema>;

export function useLoginForm({ next, onSuccess }: { next?: string; onSuccess: (to: string) => Promise<void> }) {
    const form = useForm<LoginFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: '', password: '' },
    });

    const submit = form.handleSubmit(async (values) => {
        form.clearErrors('root');
        const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
        if (error) {
            form.setError('root', { message: error.message ?? 'Login failed' });
            return;
        }
        await onSuccess(next ?? '/');
    });

    return {
        values: form.watch(),
        errors: form.formState.errors,
        setField: (name: 'email' | 'password', value: string) =>
            form.setValue(name, value, { shouldValidate: true, shouldDirty: true }),
        submit,
        isSubmitting: form.formState.isSubmitting,
        register: form.register,
    };
}
