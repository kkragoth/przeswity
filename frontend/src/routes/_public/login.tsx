import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { authClient } from '@/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/_public/login')({
    validateSearch: (search: Record<string, unknown>) => ({
        next: typeof search.next === 'string' ? search.next : undefined,
    }),
    component: Login,
});

const FormSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
type FormValues = z.infer<typeof FormSchema>;

function Login() {
    const { t } = useTranslation('auth');
    const { t: tc } = useTranslation('common');
    const navigate = useNavigate();
    const { next } = useSearch({ from: '/_public/login' });
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(FormSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (values: FormValues) => {
        setSubmitError(null);
        const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
        if (error) {
            setSubmitError(error.message ?? 'Login failed');
            return;
        }
        await navigate({ to: next ?? '/' });
    };

    const afterDevLogin = async () => {
        await navigate({ to: next ?? '/' });
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-12">
            <div className="grid gap-12 md:grid-cols-2">
                <section>
                    <h1 className="text-3xl font-semibold">{t('login.title')}</h1>
                    <p className="mt-1 text-stone-600">{t('login.subtitle')}</p>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4 max-w-sm">
                        <div>
                            <Label htmlFor="email">{tc('labels.email')}</Label>
                            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
                            {form.formState.errors.email && (
                                <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="password">{tc('labels.password')}</Label>
                            <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
                            {form.formState.errors.password && (
                                <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                            )}
                        </div>
                        {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? `${t('login.submit')}...` : t('login.submit')}
                        </Button>
                    </form>
                    <p className="mt-6 text-sm text-stone-500">{t('login.noAccount')}</p>
                </section>

                {import.meta.env.DEV && <DevQuickLogin onLogin={afterDevLogin} />}
            </div>
        </div>
    );
}

interface DevUser {
    id: string;
    email: string;
    name: string;
    isAdmin: boolean;
    isCoordinator: boolean;
}

function DevQuickLogin({ onLogin }: { onLogin: () => Promise<void> }) {
    const { t } = useTranslation('auth');
    const [users, setUsers] = useState<DevUser[]>([]);
    const [filter, setFilter] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

    useEffect(() => {
        let cancelled = false;
        fetch(`${apiUrl}/api/auth/dev/users`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() : [])
            .then((data: DevUser[]) => { if (!cancelled) setUsers(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [apiUrl]);

    const signInAs = async (email: string) => {
        setBusy(email);
        try {
            const r = await fetch(`${apiUrl}/api/auth/dev/sign-in`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email }),
            });
            if (r.ok) await onLogin();
        } finally {
            setBusy(null);
        }
    };

    const matchesFilter = (u: DevUser) =>
        u.email.toLowerCase().includes(filter.toLowerCase()) ||
        u.name.toLowerCase().includes(filter.toLowerCase());

    const filtered = users.filter(matchesFilter);

    return (
        <section>
            <h2 className="text-xl font-semibold">{t('devLogin.title')}</h2>
            <p className="text-stone-600 mt-1">{t('devLogin.subtitle')}</p>
            <Input
                className="mt-4"
                placeholder={t('devLogin.search')}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            />
            <ul className="mt-3 space-y-2">
                {filtered.map((u) => (
                    <li key={u.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-stone-500">{u.email}</div>
                            <div className="mt-1 flex gap-1">
                                {u.isAdmin && <Badge>Admin</Badge>}
                                {u.isCoordinator && <Badge variant="secondary">Koord</Badge>}
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => signInAs(u.email)}
                            disabled={busy === u.email}
                        >
                            {busy === u.email ? '...' : t('login.submit')}
                        </Button>
                    </li>
                ))}
                {users.length === 0 && (
                    <li className="text-sm text-stone-500">No dev users available.</li>
                )}
            </ul>
        </section>
    );
}
