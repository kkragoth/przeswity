import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { meGet, mePatch } from '@/api/generated/services.gen';
import type { PatchMeBody } from '@/api/generated/types.gen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher';

const ME_KEY = ['me'] as const;

export const Route = createFileRoute('/_app/settings/')({
    component: SettingsPage,
});

function SettingsPage() {
    const { t } = useTranslation('common');
    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
            <Tabs defaultValue="profile" className="mt-6">
                <TabsList>
                    <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
                </TabsList>
                <TabsContent value="profile">
                    <ProfileTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function ProfileTab() {
    const { t } = useTranslation('common');
    const qc = useQueryClient();
    const { data: me } = useQuery({
        queryKey: ME_KEY,
        queryFn: async () => (await meGet()).data,
    });

    const [name, setName] = useState('');
    const [color, setColor] = useState('#888888');
    const [image, setImage] = useState('');

    useEffect(() => {
        if (!me) return;
        setName(me.name);
        setColor(me.color);
        setImage(me.image ?? '');
    }, [me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const m = useMutation({
        mutationFn: () => {
            const body: PatchMeBody = {
                name,
                color,
                image: image.length > 0 ? image : null,
            };
            return mePatch({ body });
        },
        onSuccess: () => {
            toast.success(t('settings.profile.saved'));
            void qc.invalidateQueries({ queryKey: ME_KEY });
        },
    });

    if (!me) return <p className="mt-6 text-sm text-stone-500">{t('states.loading')}</p>;

    return (
        <div className="mt-6 max-w-md space-y-4">
            <ReadOnlyField label={t('labels.email')} value={me.email} />
            <div>
                <Label htmlFor="profile-name">{t('labels.name')}</Label>
                <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
                <Label htmlFor="profile-color">{t('labels.color')}</Label>
                <Input
                    id="profile-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                />
            </div>
            <div>
                <Label htmlFor="profile-image">{t('labels.image')}</Label>
                <Input
                    id="profile-image"
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                />
            </div>
            <div>
                <Label>{t('labels.language')}</Label>
                <div className="mt-1">
                    <LanguageSwitcher />
                </div>
            </div>
            <Button onClick={() => m.mutate()} disabled={m.isPending}>
                {m.isPending ? t('states.saving') : t('actions.save')}
            </Button>
        </div>
    );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label>{label}</Label>
            <Input value={value} disabled />
        </div>
    );
}

