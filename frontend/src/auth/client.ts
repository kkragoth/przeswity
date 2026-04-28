import { createAuthClient } from 'better-auth/react';

const baseURL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080') + '/api/auth';

export const authClient = createAuthClient({
    baseURL,
    fetchOptions: { credentials: 'include' },
});

export const { useSession, signIn, signOut, getSession } = authClient;
