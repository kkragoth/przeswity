/**
 * T-63 / T-80 — per-session UI store contract.
 *
 * Verifies the factory shape and the lifetime guarantee that two
 * `createSessionStore()` calls return INDEPENDENT stores. Module singletons
 * + key remount was the bug we deliberately moved away from in r2.
 */
import { describe, expect, it } from 'vitest';

import { LeftTab } from '@/containers/editor/layout/LeftPane';
import { RightTab } from '@/containers/editor/layout/RightPane';
import { createSessionStore } from '@/containers/editor/session/sessionStore';

describe('createSessionStore', () => {
    it('initialises with the documented defaults', () => {
        const store = createSessionStore();
        const state = store.getState();
        expect(state.activeCommentId).toBeNull();
        expect(state.pendingNewComment).toBeNull();
        expect(state.leftTab).toBe(LeftTab.Outline);
        expect(state.rightTab).toBe(RightTab.Comments);
        expect(state.findOpen).toBe(false);
        expect(state.shortcutsOpen).toBe(false);
    });

    it('two factory calls produce isolated stores (per-session lifetime)', () => {
        const a = createSessionStore();
        const b = createSessionStore();

        a.getState().setActiveComment('thread-a');
        a.getState().enqueuePendingComment({ id: 'thread-a', quote: 'q' });
        a.getState().setLeftTab(LeftTab.Versions);
        a.getState().openFind();

        // b's state must be untouched.
        expect(b.getState().activeCommentId).toBeNull();
        expect(b.getState().pendingNewComment).toBeNull();
        expect(b.getState().leftTab).toBe(LeftTab.Outline);
        expect(b.getState().findOpen).toBe(false);

        // a's state reflects its own writes.
        expect(a.getState().activeCommentId).toBe('thread-a');
        expect(a.getState().leftTab).toBe(LeftTab.Versions);
    });

    it('enqueuePendingComment then consumePendingComment returns + clears', () => {
        const store = createSessionStore();
        const payload = { id: 't1', quote: 'hello' };
        store.getState().enqueuePendingComment(payload);
        expect(store.getState().pendingNewComment).toEqual(payload);

        const consumed = store.getState().consumePendingComment();
        expect(consumed).toEqual(payload);
        expect(store.getState().pendingNewComment).toBeNull();
    });

    it('consumePendingComment on an empty queue returns null and is a no-op', () => {
        const store = createSessionStore();
        const before = store.getState().pendingNewComment;
        const result = store.getState().consumePendingComment();
        expect(result).toBeNull();
        expect(store.getState().pendingNewComment).toBe(before);
    });

    it('toggleShortcuts flips the flag; closeShortcuts always sets to false', () => {
        const store = createSessionStore();
        expect(store.getState().shortcutsOpen).toBe(false);

        store.getState().toggleShortcuts();
        expect(store.getState().shortcutsOpen).toBe(true);

        store.getState().toggleShortcuts();
        expect(store.getState().shortcutsOpen).toBe(false);

        // Re-open then closeShortcuts → false regardless of toggle state.
        store.getState().toggleShortcuts();
        store.getState().closeShortcuts();
        expect(store.getState().shortcutsOpen).toBe(false);
        store.getState().closeShortcuts();
        expect(store.getState().shortcutsOpen).toBe(false);
    });

    it('setActiveComment round-trips and clears with null', () => {
        const store = createSessionStore();
        store.getState().setActiveComment('abc');
        expect(store.getState().activeCommentId).toBe('abc');
        store.getState().setActiveComment(null);
        expect(store.getState().activeCommentId).toBeNull();
    });

    it('setLeftTab / setRightTab persist the chosen enum value', () => {
        const store = createSessionStore();
        store.getState().setLeftTab(LeftTab.Glossary);
        store.getState().setRightTab(RightTab.Suggestions);
        expect(store.getState().leftTab).toBe(LeftTab.Glossary);
        expect(store.getState().rightTab).toBe(RightTab.Suggestions);
    });

    it('openFind / closeFind toggle the find bar', () => {
        const store = createSessionStore();
        store.getState().openFind();
        expect(store.getState().findOpen).toBe(true);
        store.getState().closeFind();
        expect(store.getState().findOpen).toBe(false);
    });

    it('changing tabs leaves comment state untouched', () => {
        const store = createSessionStore();
        const pending = { id: 't1', quote: 'q' };
        store.getState().setActiveComment('t1');
        store.getState().enqueuePendingComment(pending);

        store.getState().setLeftTab(LeftTab.Versions);
        store.getState().setRightTab(RightTab.Suggestions);

        expect(store.getState().activeCommentId).toBe('t1');
        expect(store.getState().pendingNewComment).toEqual(pending);
        expect(store.getState().leftTab).toBe(LeftTab.Versions);
        expect(store.getState().rightTab).toBe(RightTab.Suggestions);
    });
});
