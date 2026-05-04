// INVARIANT: this backend must run as a SINGLE PROCESS. Presence (collab/presence.ts) and
// the Hocuspocus document store are process-local. Multi-process deployments must set
// PRESENCE_API_ENABLED=false and accept that collab presence/cursors are partial per pod
// until a Redis-backed store lands.
import { Hocuspocus, type onAuthenticatePayload } from '@hocuspocus/server';
import { authenticate } from './auth.js';
import { persistence } from './persistence.js';
import { presenceExtension, presenceHeartbeat } from './presence.js';
import { log } from '../lib/log.js';

const extensions = [persistence, presenceExtension, presenceHeartbeat];

export const hocuspocus = new Hocuspocus({
    extensions,
    async onAuthenticate(data: onAuthenticatePayload) {
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

const extensionNames = extensions
    .map((e) => (e as { constructor?: { name?: string } }).constructor?.name ?? typeof e);
log.info('collab extensions loaded', { count: extensionNames.length, extensions: extensionNames });
