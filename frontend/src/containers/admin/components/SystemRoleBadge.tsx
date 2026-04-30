import { Badge } from '@/components/ui/badge';

export function SystemRoleBadge({ systemRole }: { systemRole: string | null | undefined }) {
    if (systemRole === 'admin') return <Badge>Admin</Badge>;
    if (systemRole === 'project_manager') return <Badge variant="secondary">Project Manager</Badge>;
    return null;
}
