import { createServer } from 'node:http';
import { parse } from 'node:url';
import { WebSocketServer } from 'ws';
import { buildApp, devAuthEnabled } from './app.js';
import { hocuspocus } from './collab/server.js';
import { env } from './env.js';

const app = await buildApp();
console.log(`dev-auth: ${devAuthEnabled ? 'enabled' : 'disabled'}`);

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url ?? '/');
    if (pathname !== env.COLLAB_PATH) {
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
        hocuspocus.handleConnection(ws, req);
    });
});

server.listen(env.PORT, () => {
    console.log(`backend listening on :${env.PORT} (collab: ${env.COLLAB_PATH})`);
});
