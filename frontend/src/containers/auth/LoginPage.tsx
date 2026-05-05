import { useNavigate, useSearch } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DevQuickLogin } from '@/containers/auth/components/DevQuickLogin';
import { useLoginForm } from '@/hooks/api/useLoginForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginPage() {
    const { t } = useTranslation('auth');
    const { t: tc } = useTranslation('common');
    const navigate = useNavigate();
    const { next, reason } = useSearch({ from: '/_public/login' });
    const form = useLoginForm({ next, onSuccess: async (to) => navigate({ to }) });

    const afterDevLogin = async () => navigate({ to: next ?? '/' });

    return (
        <div className="mx-auto max-w-5xl px-4 py-12">
            <div className="grid gap-12 md:grid-cols-2">
                <section>
                    <h1 className="text-3xl font-semibold">{t('login.title')}</h1>
                    <p className="mt-1 text-muted-foreground">{t('login.subtitle')}</p>
                    {reason === 'session-unavailable' ? <p className="mt-3 text-sm text-destructive">{t('sessionUnavailable')}</p> : null}
                    <form onSubmit={form.submit} className="mt-6 max-w-sm space-y-4">
                        <div>
                            <Label htmlFor="email">{tc('labels.email')}</Label>
                            <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
                            {form.errors.email ? <p className="mt-1 text-sm text-destructive">{form.errors.email.message}</p> : null}
                        </div>
                        <div>
                            <Label htmlFor="password">{tc('labels.password')}</Label>
                            <Input id="password" type="password" autoComplete="current-password" {...form.register('password')} />
                            {form.errors.password ? <p className="mt-1 text-sm text-destructive">{form.errors.password.message}</p> : null}
                        </div>
                        {form.errors.root ? <p className="text-sm text-destructive">{form.errors.root.message}</p> : null}
                        <Button type="submit" disabled={form.isSubmitting}>
                            {form.isSubmitting ? `${t('login.submit')}...` : t('login.submit')}
                        </Button>
                    </form>
                    <p className="mt-6 text-sm text-muted-foreground">{t('login.noAccount')}</p>
                </section>
                {import.meta.env.DEV ? <DevQuickLogin onLogin={afterDevLogin} /> : null}
            </div>
        </div>
    );
}
