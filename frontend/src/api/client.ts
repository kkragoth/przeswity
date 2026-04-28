import { client } from '@/api/generated/services.gen';

client.setConfig({
    baseUrl: import.meta.env.VITE_API_URL,
    credentials: 'include',
});

import '@/api/interceptors';
