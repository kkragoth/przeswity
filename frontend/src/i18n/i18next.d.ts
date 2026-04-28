import 'i18next';
import type plCommon from '../locales/pl/common.json';
import type plAuth from '../locales/pl/auth.json';
import type plAdmin from '../locales/pl/admin.json';
import type plCoordinator from '../locales/pl/coordinator.json';
import type plEditor from '../locales/pl/editor.json';
import type plErrors from '../locales/pl/errors.json';

declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: {
            common: typeof plCommon;
            auth: typeof plAuth;
            admin: typeof plAdmin;
            coordinator: typeof plCoordinator;
            editor: typeof plEditor;
            errors: typeof plErrors;
        };
    }
}
