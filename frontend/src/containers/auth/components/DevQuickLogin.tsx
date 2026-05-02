import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// TODO Phase 30 — promote systemRole literals to SystemRole enum

interface DevUser {
    id: string;
    email: string;
    name: string;
    systemRole: 'admin' | 'project_manager' | null;
}

export function DevQuickLogin({ onLogin }: { onLogin: () => Promise<void> }) {
    const { t } = useTranslation('auth');
    const { t: tc } = useTranslation('common');
    const [users, setUsers] = useState<DevUser[]>([]);
    const [filter, setFilter] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

    useEffect(() => {
        let cancelled = false;
        fetch(`${apiUrl}/api/auth/dev/users`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: DevUser[]) => {
                if (!cancelled) setUsers(data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [apiUrl]);

    const signInAs = async (email: string) => {
        setBusy(email);
        try {
            const response = await fetch(`${apiUrl}/api/auth/dev/sign-in`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email }),
            });
            if (response.ok) await onLogin();
        } finally {
            setBusy(null);
        }
    };

    const q = filter.toLowerCase();
    const filtered = users.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));

    return (
        <section>
            <h2 className="text-xl font-semibold">{t('devLogin.title')}</h2>
            <p className="mt-1 text-stone-600">{t('devLogin.subtitle')}</p>
            <Input className="mt-4" placeholder={t('devLogin.search')} value={filter} onChange={(e) => setFilter(e.target.value)} />
            <ul className="mt-3 space-y-2">
                {filtered.map((u) => (
                    <li key={u.id} className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                        <div>
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-stone-500">{u.email}</div>
                            <div className="mt-1 flex gap-1">
                                {u.systemRole === 'admin' ? <Badge>{tc('roles.admin')}</Badge> : null}
                                {u.systemRole === 'project_manager' ? <Badge variant="secondary">{tc('roles.projectManagerShort')}</Badge> : null}
                            </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => signInAs(u.email)} disabled={busy === u.email}>
                            {busy === u.email ? tc('states.saving') : t('login.submit')}
                        </Button>
                    </li>
                ))}
                {users.length === 0 ? <li className="text-sm text-stone-500">{t('devLogin.empty')}</li> : null}
            </ul>
        </section>
    );
}
