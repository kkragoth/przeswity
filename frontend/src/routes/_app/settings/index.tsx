import { createFileRoute } from '@tanstack/react-router';
import { SettingsPage } from '@/containers/settings/SettingsPage';

export const Route = createFileRoute('/_app/settings/')({
    component: SettingsPage,
});
