import { describe, it, expect } from 'vitest';
import { toggleEmojiPresence } from './reactions';

describe('toggleEmojiPresence', () => {
    it('adds emoji to empty reactions', () => {
        const result = toggleEmojiPresence(undefined, '👍', 'user1');
        expect(result).toEqual({ '👍': ['user1'] });
    });

    it('adds user to existing emoji list', () => {
        const result = toggleEmojiPresence({ '👍': ['user1'] }, '👍', 'user2');
        expect(result['👍']).toContain('user1');
        expect(result['👍']).toContain('user2');
    });

    it('removes user when already present', () => {
        const result = toggleEmojiPresence({ '👍': ['user1', 'user2'] }, '👍', 'user1');
        expect(result['👍']).not.toContain('user1');
        expect(result['👍']).toContain('user2');
    });

    it('removes emoji key when last user is removed', () => {
        const result = toggleEmojiPresence({ '👍': ['user1'] }, '👍', 'user1');
        expect(result).not.toHaveProperty('👍');
    });

    it('does not affect other emojis when toggling', () => {
        const result = toggleEmojiPresence({ '👍': ['user1'], '❤️': ['user2'] }, '👍', 'user1');
        expect(result).not.toHaveProperty('👍');
        expect(result['❤️']).toEqual(['user2']);
    });

    it('adds a new emoji key while others remain', () => {
        const result = toggleEmojiPresence({ '👍': ['user1'] }, '❤️', 'user2');
        expect(result['👍']).toEqual(['user1']);
        expect(result['❤️']).toEqual(['user2']);
    });
});
