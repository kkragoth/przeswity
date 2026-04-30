import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { roleI18nKey } from '@/lib/roleI18n';

export const ROLE_KEYS = ['editor', 'proofreader', 'translator', 'author', 'typesetter', 'coordinator'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export function RoleBadge({ role }: { role: string }) {
    const { t } = useTranslation('editor');
    return <Badge variant="secondary">{t(roleI18nKey(role))}</Badge>;
}
