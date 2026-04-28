import { createHash } from 'node:crypto';

const NS = 'przeswity-seed-v1';

export function seedUserId(email: string): string {
    const h = createHash('sha256').update(`${NS}:user:${email}`).digest('hex');
    return 'usr_' + h.slice(0, 24);
}

export function seedBookId(slug: string): string {
    const h = createHash('sha256').update(`${NS}:book:${slug}`).digest('hex');
    return [
        h.slice(0, 8),
        h.slice(8, 12),
        '5' + h.slice(13, 16),
        '8' + h.slice(17, 20),
        h.slice(20, 32),
    ].join('-');
}
