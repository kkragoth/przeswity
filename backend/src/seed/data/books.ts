import type { SeedBook } from './types.js';

export const BOOKS: SeedBook[] = [
    {
        slug: 'geopolityka-rzek',
        title: 'Geopolityka rzek',
        description: 'Esej o roli rzek transgranicznych w polityce międzynarodowej.',
        fixture: 'geopolityka-rzek.md',
        ownerEmail: 'pm1@local.test',
        assignments: [
            { email: 'editor1@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
            { email: 'author1@local.test', role: 'author' },
        ],
    },
    {
        slug: 'atlas-wiatrow',
        title: 'Atlas wiatrów',
        description: 'Tłumaczenie atlasu wiatrów stałych i lokalnych.',
        fixture: 'atlas-wiatrow.md',
        ownerEmail: 'pm1@local.test',
        assignments: [
            { email: 'trans1@local.test', role: 'translator' },
            { email: 'editor2@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
            { email: 'type1@local.test', role: 'typesetter' },
        ],
    },
    {
        slug: 'krotka-historia-chmur',
        title: 'Krótka historia chmur',
        description: 'Krótki esej o klasyfikacji chmur.',
        fixture: 'krotka-historia-chmur.md',
        ownerEmail: 'pm1@local.test',
        assignments: [
            { email: 'editor1@local.test', role: 'editor' },
            { email: 'proof1@local.test', role: 'proofreader' },
        ],
    },
    {
        slug: 'notatki-marginesu',
        title: 'Notatki marginesu',
        description: 'Krótkie rozważania.',
        fixture: 'notatki-marginesu.md',
        ownerEmail: 'pm2@local.test',
        assignments: [
            { email: 'editor2@local.test', role: 'editor' },
        ],
    },
];
