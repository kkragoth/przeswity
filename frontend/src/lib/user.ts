export function userInitials(name: string | undefined, fallback = '??'): string {
    if (!name?.trim()) return fallback;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

export function displayName(user: { name?: string; email?: string }): string {
    return user.name?.trim() || user.email?.trim() || '';
}
