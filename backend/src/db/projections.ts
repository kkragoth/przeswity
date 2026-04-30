import { user } from './auth-schema.js';

// Public columns of `user` returned alongside related rows (comment authors, snapshot
// creators, assignees). Joins should always project these columns and nothing else —
// avoids leaking email_verified / system_role / onboarding state to non-admin clients.
export const userPublicCols = {
    id: user.id,
    email: user.email,
    name: user.name,
    color: user.color,
    image: user.image,
};
