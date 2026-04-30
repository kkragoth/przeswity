import { useCallback, useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { Role } from '@/editor/identity/types';

const SETTINGS_KEY = '__settings__';
const SUGGESTING_KEY = 'suggestingMode';

const ROLES_FORCED_TO_SUGGEST: ReadonlySet<Role> = new Set(['proofreader', 'author']);

export interface SuggestingModeState {
    /** Effective mode applied to the editor (force rule already merged in). */
    effective: boolean
    /** True when role forces suggesting on regardless of stored value. */
    forced: boolean
    /** Raw stored value from the document (ignoring force). */
    stored: boolean
    /** Toggle the document-level mode. No-op when forced. */
    setMode: (next: boolean) => void
}

/**
 * Suggestion mode is per-document, shared via a Y.Map under `__settings__`.
 * Every collaborator sees the same toggle; switching it broadcasts immediately.
 */
export function useSuggestingMode(doc: Y.Doc, role: Role): SuggestingModeState {
    const settings = doc.getMap<boolean>(SETTINGS_KEY);
    const forced = ROLES_FORCED_TO_SUGGEST.has(role);
    const [stored, setStored] = useState<boolean>(() => Boolean(settings.get(SUGGESTING_KEY)));

    useEffect(() => {
        const onChange = () => setStored(Boolean(settings.get(SUGGESTING_KEY)));
        settings.observe(onChange);
        onChange();
        return () => settings.unobserve(onChange);
    }, [settings]);

    const setMode = useCallback(
        (next: boolean) => {
            if (forced) return;
            settings.set(SUGGESTING_KEY, next);
        },
        [forced, settings],
    );

    return {
        effective: forced || stored,
        forced,
        stored,
        setMode,
    };
}
