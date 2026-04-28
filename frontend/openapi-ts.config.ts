import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: `${process.env.PUBLIC_API_URL ?? 'http://localhost:8080'}/openapi.json`,
    output: 'src/api/generated',
    client: '@hey-api/client-fetch',
    plugins: ['@tanstack/react-query'],
});
