import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { roleI18nKey } from '@/lib/roleI18n';
import { Role, ALL_ROLES } from '@/editor/identity/types';

export { Role, ALL_ROLES };

export function RoleBadge({ role }: { role: string }) {
    const { t } = useTranslation('editor');
    return <Badge variant="secondary">{t(roleI18nKey(role))}</Badge>;
}
