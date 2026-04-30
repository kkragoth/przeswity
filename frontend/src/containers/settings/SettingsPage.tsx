import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ReadOnlyField } from '@/components/forms/ReadOnlyField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';
import { useProfileSettings } from '@/hooks/api/useProfileSettings';

export function SettingsPage() {
    const { t } = useTranslation('common');
    const profile = useProfileSettings();

    const save = async () => {
        await profile.save();
        toast.success(t('settings.profile.saved'));
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
            <Tabs defaultValue="profile" className="mt-6">
                <TabsList>
                    <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    {!profile.me ? (
                        <p className="mt-6 text-sm text-stone-500">{t('states.loading')}</p>
                    ) : (
                        <div className="mt-6 max-w-md space-y-4">
                            <ReadOnlyField label={t('labels.email')} value={profile.me.email} />
                            <div>
                                <Label htmlFor="profile-name">{t('labels.name')}</Label>
                                <Input id="profile-name" value={profile.values.name} onChange={(e) => profile.setField('name', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="profile-color">{t('labels.color')}</Label>
                                <Input id="profile-color" type="color" value={profile.values.color} onChange={(e) => profile.setField('color', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="profile-image">{t('labels.image')}</Label>
                                <Input id="profile-image" type="url" value={profile.values.image} onChange={(e) => profile.setField('image', e.target.value)} />
                            </div>
                            <div>
                                <Label>{t('labels.language')}</Label>
                                <div className="mt-1">
                                    <LanguageSwitcher />
                                </div>
                            </div>
                            <Button onClick={save} disabled={profile.isSaving || !profile.isDirty}>
                                {profile.isSaving ? t('states.saving') : t('actions.save')}
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
