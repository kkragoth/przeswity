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

export interface SeedBook {
    slug: string;
    title: string;
    description: string;
    fixture: string;
    ownerEmail: string;
    assignments: { email: string; role: Role }[];
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
    body: string;
    minutesAgo: number;
    status: 'open' | 'resolved';
    resolvedBy?: string;
    resolvedMinutesAgo?: number;
    replies: SeedReply[];
}
