import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

// TODO Phase 30 — promote to SystemRole enum
export function SystemRoleBadge({ systemRole }: { systemRole: string | null | undefined }) {
    const { t } = useTranslation('common');
    if (systemRole === 'admin') return <Badge>{t('roles.admin')}</Badge>;
    if (systemRole === 'project_manager') return <Badge variant="secondary">{t('roles.projectManager')}</Badge>;
    return null;
}
