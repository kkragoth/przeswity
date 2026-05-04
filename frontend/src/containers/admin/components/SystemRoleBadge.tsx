import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { SystemRole } from '@/auth/types';

export function SystemRoleBadge({ systemRole }: { systemRole: SystemRole | string | null | undefined }) {
    const { t } = useTranslation('common');
    if (systemRole === SystemRole.Admin) return <Badge>{t('roles.admin')}</Badge>;
    if (systemRole === SystemRole.ProjectManager) return <Badge variant="secondary">{t('roles.projectManager')}</Badge>;
    return null;
}
