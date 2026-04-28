import { Hocuspocus } from '@hocuspocus/server';
import { authenticate } from './auth.js';
import { persistence } from './persistence.js';
import { presenceExtension, presenceHeartbeat } from './presence.js';
import { attributionExtension } from './lastEditor.js';

const extensions = [persistence, attributionExtension, presenceExtension, presenceHeartbeat];

export const hocuspocus = new Hocuspocus({
    extensions,
    async onAuthenticate(data: any) {
        const ctx = await authenticate({
            documentName: data.documentName,
            requestHeaders: data.requestHeaders,
        });
        if (data.connection) {
            data.connection.readOnly = ctx.readOnly;
        }
        return ctx;
    },
});

console.log('[collab] extensions:', extensions.map((e) => (e as any).constructor?.name ?? typeof e).join(', '));
