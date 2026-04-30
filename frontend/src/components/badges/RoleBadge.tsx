import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

export const ROLE_KEYS = ['editor', 'proofreader', 'translator', 'author', 'typesetter', 'coordinator'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const FALLBACK: Record<string, string> = {
    editor: 'Redaktor',
    proofreader: 'Korekta',
    translator: 'Tłumacz',
    author: 'Autor',
    typesetter: 'Skład',
    coordinator: 'Koordynator',
};

export function RoleBadge({ role }: { role: string }) {
    const { t } = useTranslation('editor');
    const label = t(`roles.${role}`, { defaultValue: FALLBACK[role] ?? role });
    return <Badge variant="secondary">{label}</Badge>;
}
