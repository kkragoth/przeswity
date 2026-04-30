import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserFormState } from '@/containers/admin/hooks/useUserForm';

export function UserFormFields({
    form,
    onChange,
    includePassword,
}: {
    form: UserFormState;
    onChange: (next: UserFormState) => void;
    includePassword?: boolean;
}) {
    const { t: ta } = useTranslation('admin');
    const { t: tc } = useTranslation('common');
    const set = <K extends keyof UserFormState>(k: K, v: UserFormState[K]) => onChange({ ...form, [k]: v });

    return (
        <div className="space-y-3">
            <div><Label>{tc('labels.email')}</Label><Input value={form.email} disabled={!includePassword} onChange={(e) => set('email', e.target.value)} /></div>
            <div><Label>{tc('labels.name')}</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            {includePassword ? <div><Label>{tc('labels.password')}</Label><Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} /></div> : null}
            <div><Label>{tc('labels.color')}</Label><Input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} /></div>
            <div><Label>{ta('users.form.competencyTags')}</Label><Input value={form.competencyTagsRaw} placeholder={ta('users.form.competencyTagsHint')} onChange={(e) => set('competencyTagsRaw', e.target.value)} /></div>
            <div>
                <Label>{ta('users.form.systemRole')}</Label>
                <select className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm" value={form.systemRole ?? ''} onChange={(e) => set('systemRole', (e.target.value || null) as UserFormState['systemRole'])}>
                    <option value="">{ta('users.form.systemRoleNone')}</option>
                    <option value="project_manager">{ta('users.form.systemRoleProjectManager')}</option>
                    <option value="admin">{ta('users.form.systemRoleAdmin')}</option>
                </select>
            </div>
        </div>
    );
}
