export const QUICK_REACTIONS = ['👍', '❤️', '🎉', '✅', '🤔', '❓', '🚀'] as const;

/**
 * Pure helper for toggling a user's presence on an emoji reaction.
 * Adding when absent, removing when present; cleans up empty arrays.
 */
export function toggleEmojiPresence(
    reactions: Record<string, string[]> | undefined,
    emoji: string,
    userId: string,
): Record<string, string[]> {
    const next = { ...(reactions ?? {}) };
    const ids = new Set(next[emoji] ?? []);
    if (ids.has(userId)) ids.delete(userId);
    else ids.add(userId);
    if (ids.size === 0) delete next[emoji];
    else next[emoji] = [...ids];
    return next;
}
