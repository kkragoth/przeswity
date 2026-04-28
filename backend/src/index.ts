import { buildApp, devAuthEnabled } from './app.js';
import { env } from './env.js';

const app = await buildApp();
console.log(`dev-auth: ${devAuthEnabled ? 'enabled' : 'disabled'}`);
app.listen(env.PORT, () => {
    console.log(`backend listening on :${env.PORT}`);
});
