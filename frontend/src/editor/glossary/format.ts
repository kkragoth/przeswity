import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';

/**
 * Builds the tooltip string for a glossary highlight decoration.
 * The arrow (→) and dot separator (·) are presentation markers; if future
 * locales need different separators, add i18n keys here.
 */
export function formatGlossaryTooltip(entry: GlossaryEntry): string {
    if (!entry.translation) return entry.term;
    const base = `${entry.term} → ${entry.translation}`;
    return entry.notes ? `${base} · ${entry.notes}` : base;
}
