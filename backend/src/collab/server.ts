// INVARIANT: this backend must run as a SINGLE PROCESS. Presence (collab/presence.ts) and
// the Hocuspocus document store are process-local. Multi-process deployments must set
// PRESENCE_API_ENABLED=false and accept that collab presence/cursors are partial per pod
// until a Redis-backed store lands.
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
