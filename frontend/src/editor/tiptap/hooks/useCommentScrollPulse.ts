import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { HEADING_PULSE_MS } from '@/editor/constants';
import { CommentStatus, type CommentThread } from '@/editor/comments/types';

const PULSE_CLASS = 'comment-pulse';
const ACTIVE_MARK_CLASS = 'is-active';
const RESOLVED_MARK_CLASS = 'is-resolved';
const HOST_HAS_ACTIVE_CLASS = 'has-active-comment';

/**
 * Tags every `[data-comment-id]` span belonging to a Resolved thread with
 * `.is-resolved` so CSS can mute the highlight without removing the mark.
 * Keeping the mark in place means resolve/reopen is a pure y-doc status flip
 * — the inline pin reactively appears and disappears as `thread.status`
 * changes, regardless of editor undo history.
 */
export function useResolvedCommentMarkClass(
    editor: Editor | null,
    threads: CommentThread[],
): void {
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const resolvedIds = new Set(
            threads.filter((t) => t.status === CommentStatus.Resolved).map((t) => t.id),
        );
        const apply = () => {
            dom.querySelectorAll<HTMLElement>('[data-comment-id]').forEach((el) => {
                const id = el.getAttribute('data-comment-id');
                if (id && resolvedIds.has(id)) el.classList.add(RESOLVED_MARK_CLASS);
                else el.classList.remove(RESOLVED_MARK_CLASS);
            });
        };
        apply();
        // The mark spans get re-rendered by ProseMirror on every doc change;
        // reapply after editor updates so newly-rendered spans pick up the
        // class for any thread that's already Resolved.
        editor.on('update', apply);
        return () => {
            editor.off('update', apply);
            dom.querySelectorAll<HTMLElement>('[data-comment-id]').forEach((el) =>
                el.classList.remove(RESOLVED_MARK_CLASS),
            );
        };
    }, [editor, threads]);
}

/**
 * Tags the active comment's anchor span(s) with `.is-active` and the
 * prosemirror host with `.has-active-comment`. CSS uses the host marker to
 * dim all non-active `.comment-anchor` marks (so the active selection pops).
 */
export function useActiveCommentMarkClass(
    editor: Editor | null,
    activeCommentId: string | null,
): void {
    useEffect(() => {
        if (!editor) return;
        const dom = editor.view.dom as HTMLElement;
        const allAnchors = dom.querySelectorAll<HTMLElement>('[data-comment-id]');
        allAnchors.forEach((el) => el.classList.remove(ACTIVE_MARK_CLASS));
        if (activeCommentId) {
            dom.classList.add(HOST_HAS_ACTIVE_CLASS);
            dom.querySelectorAll<HTMLElement>(
                `[data-comment-id="${CSS.escape(activeCommentId)}"]`,
            ).forEach((el) => el.classList.add(ACTIVE_MARK_CLASS));
        } else {
            dom.classList.remove(HOST_HAS_ACTIVE_CLASS);
        }
        return () => {
            dom.classList.remove(HOST_HAS_ACTIVE_CLASS);
            dom.querySelectorAll<HTMLElement>('[data-comment-id]').forEach((el) =>
                el.classList.remove(ACTIVE_MARK_CLASS),
            );
        };
    }, [editor, activeCommentId]);
}

/** Visible margin at top/bottom that counts as "comfortably in view". */
const SCROLL_VISIBLE_PAD = 24;
/** Where vertically the activated comment lands when we DO scroll. 0 = top, 1 = bottom. */
const SCROLL_TARGET_RATIO = 0.25;

function applyPulse(spans: NodeListOf<HTMLElement>): void {
    spans.forEach((span) => {
        span.classList.remove(PULSE_CLASS);
        void span.offsetWidth; // force reflow so the animation restarts
        span.classList.add(PULSE_CLASS);
    });
}

/**
 * When `activeCommentId` becomes non-null OR `pulseTick` increments, place
 * the matching anchor span ~25% from the top of the editor scroller (only if
 * it's actually off-screen) and play the pulse animation. The tick lets the
 * caller force a replay even when the id didn't change (e.g. re-clicking the
 * already-active thread).
 */
export function useCommentScrollPulse(
    editor: Editor | null,
    activeCommentId: string | null,
    pulseTick: number,
): void {
    useEffect(() => {
        if (!editor || !activeCommentId) return;
        const dom = editor.view.dom as HTMLElement;
        const spans = dom.querySelectorAll<HTMLElement>(
            `[data-comment-id="${CSS.escape(activeCommentId)}"]`,
        );
        if (spans.length === 0) return;

        const scroller = dom.closest('.editor-scroll') as HTMLElement | null;
        const target = spans[0];
        const tr = target.getBoundingClientRect();

        let didScroll = false;
        if (scroller) {
            const sr = scroller.getBoundingClientRect();
            const visible = tr.top >= sr.top + SCROLL_VISIBLE_PAD
                && tr.bottom <= sr.bottom - SCROLL_VISIBLE_PAD;
            if (!visible) {
                // Position the span 25% down from the scroller's top — gives
                // breathing room above the comment instead of slamming it to
                // the very edge.
                const scrollDelta = (tr.top - sr.top) - sr.height * SCROLL_TARGET_RATIO;
                scroller.scrollTo({
                    top: scroller.scrollTop + scrollDelta,
                    behavior: 'smooth',
                });
                didScroll = true;
            }
        }

        // Pulse immediately so it's never tied to scroll completion. If we
        // *did* scroll, also re-trigger after the smooth animation settles —
        // first-activation scrolls used to mask the pulse as the span moved
        // into the viewport.
        applyPulse(spans);
        const replay = didScroll
            ? window.setTimeout(() => applyPulse(spans), 320)
            : 0;
        const clear = window.setTimeout(() => {
            spans.forEach((span) => span.classList.remove(PULSE_CLASS));
        }, HEADING_PULSE_MS + (didScroll ? 320 : 0));

        return () => {
            window.clearTimeout(replay);
            window.clearTimeout(clear);
            spans.forEach((span) => span.classList.remove(PULSE_CLASS));
        };
    }, [editor, activeCommentId, pulseTick]);
}
