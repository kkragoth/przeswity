import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import plCommon from '@/locales/pl/common.json';
import plAuth from '@/locales/pl/auth.json';
import plAdmin from '@/locales/pl/admin.json';
import plCoordinator from '@/locales/pl/coordinator.json';
import plEditor from '@/locales/pl/editor.json';
import plErrors from '@/locales/pl/errors.json';

import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enAdmin from '@/locales/en/admin.json';
import enCoordinator from '@/locales/en/coordinator.json';
import enEditor from '@/locales/en/editor.json';
import enErrors from '@/locales/en/errors.json';

import uaCommon from '@/locales/ua/common.json';
import uaAuth from '@/locales/ua/auth.json';
import uaAdmin from '@/locales/ua/admin.json';
import uaCoordinator from '@/locales/ua/coordinator.json';
import uaEditor from '@/locales/ua/editor.json';
import uaErrors from '@/locales/ua/errors.json';

export const SUPPORTED = ['pl', 'en', 'ua'] as const;
export type Locale = (typeof SUPPORTED)[number];

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            pl: { common: plCommon, auth: plAuth, admin: plAdmin, coordinator: plCoordinator, editor: plEditor, errors: plErrors },
            en: { common: enCommon, auth: enAuth, admin: enAdmin, coordinator: enCoordinator, editor: enEditor, errors: enErrors },
            ua: { common: uaCommon, auth: uaAuth, admin: uaAdmin, coordinator: uaCoordinator, editor: uaEditor, errors: uaErrors },
        },
        fallbackLng: ['pl', 'en'],
        supportedLngs: SUPPORTED as unknown as string[],
        nonExplicitSupportedLngs: false,
        defaultNS: 'common',
        ns: ['common', 'auth', 'admin', 'coordinator', 'editor', 'errors'],
        interpolation: { escapeValue: false },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'przeswity.lang',
            convertDetectedLanguage: (lng: string) => {
                const base = lng.toLowerCase().split('-')[0];
                return base === 'uk' ? 'ua' : base;
            },
        },
        returnNull: false,
    });

export default i18n;
