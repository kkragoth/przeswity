export function displayName(user: { name?: string; email?: string }): string {
    return user.name?.trim() || user.email?.trim() || '';
}
