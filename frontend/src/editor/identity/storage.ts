import { Role, type User } from './types';

const COLORS = ['#e11d48', '#7c3aed', '#0891b2', '#16a34a', '#ea580c', '#9333ea', '#0284c7'];

const NAMES = ['Anna', 'Marek', 'Kasia', 'Tomek', 'Ola', 'Piotr', 'Magda', 'Adam'];

const STORAGE_KEY = 'editor-poc.user';

export function loadUser(): User {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            return JSON.parse(raw) as User;
        } catch {
            // fall through
        }
    }
    const id = Math.random().toString(36).slice(2, 10);
    const name = NAMES[Math.floor(Math.random() * NAMES.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const user: User = { id, name, color, role: Role.Editor };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
}

export function saveUser(user: User): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function setRole(user: User, role: Role): User {
    const next = { ...user, role };
    saveUser(next);
    return next;
}

export function setName(user: User, name: string): User {
    const next = { ...user, name };
    saveUser(next);
    return next;
}
