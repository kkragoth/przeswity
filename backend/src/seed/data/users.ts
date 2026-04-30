import type { SeedUser } from './types.js';

export const USERS: SeedUser[] = [
    { email: 'admin@local.test', name: 'Admin Adminowska', systemRole: 'admin', tags: [], color: '#dc2626' },
    { email: 'pm1@local.test', name: 'Anna Kierownik', systemRole: 'project_manager', tags: ['kierownik'], color: '#2563eb' },
    { email: 'pm2@local.test', name: 'Bartek Kierownik', systemRole: 'project_manager', tags: ['kierownik'], color: '#0ea5e9' },
    { email: 'editor1@local.test', name: 'Ewa Redaktor', systemRole: null, tags: ['redaktor'], color: '#16a34a' },
    { email: 'editor2@local.test', name: 'Filip Redaktor', systemRole: null, tags: ['redaktor'], color: '#22c55e' },
    { email: 'proof1@local.test', name: 'Gosia Korektor', systemRole: null, tags: ['korekta'], color: '#a855f7' },
    { email: 'trans1@local.test', name: 'Hubert Tłumacz', systemRole: null, tags: ['tłumacz'], color: '#f59e0b' },
    { email: 'type1@local.test', name: 'Iza Składacz', systemRole: null, tags: ['skład'], color: '#ec4899' },
    { email: 'author1@local.test', name: 'Jan Autor', systemRole: null, tags: ['autor'], color: '#7c3aed' },
];
