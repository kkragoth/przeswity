import type { BookRole } from '../../lib/permissions.js';

export type Role = BookRole;
export type SystemRole = 'admin' | 'project_manager' | null;

export interface SeedUser {
    email: string;
    name: string;
    systemRole: SystemRole;
    tags: string[];
    color: string;
}

export interface SeedMeta {
    title?: string;
    isbn?: string;
    targetWords?: number;
    deadline?: string;
    notes?: string;
}

export interface SeedGlossaryEntry {
    id: string;
    term: string;
    translation: string;
    notes?: string;
    updatedAtMinutesAgo: number;
}

export interface SeedSnapshot {
    label: string;
    minutesAgo: number;
    createdByEmail: string;
}

export interface SeedBook {
    slug: string;
    title: string;
    description: string;
    fixture: string;
    ownerEmail: string;
    assignments: { email: string; role: Role }[];
    meta: SeedMeta;
    glossary: SeedGlossaryEntry[];
    snapshots: SeedSnapshot[];
}

export interface SeedActor {
    id: string;
    name: string;
    role: Role;
    color: string;
}

export interface SeedReply {
    author: SeedActor;
    body: string;
    minutesAgo: number;
}

export interface SeedThread {
    id: string;
    anchorId: string;
    author: SeedActor;
    targetRole: Role | null;
    originalQuote: string;
    /** Which occurrence of `originalQuote` to anchor on (0 = first match in doc order). */
    occurrenceIndex: number;
    body: string;
    minutesAgo: number;
    status: 'open' | 'resolved';
    resolvedBy?: string;
    resolvedMinutesAgo?: number;
    replies: SeedReply[];
}
