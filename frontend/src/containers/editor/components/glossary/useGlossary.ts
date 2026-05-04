import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';

export interface StoredEntry extends GlossaryEntry {
    id: string;
    updatedAt: number;
}

export function useGlossary(doc: Y.Doc): StoredEntry[] {
    const [entries, setEntries] = useState<StoredEntry[]>([]);
    useEffect(() => {
        const map = doc.getMap('glossary') as Y.Map<StoredEntry>;
        const update = () => {
            const out: StoredEntry[] = [];
            map.forEach((v) => out.push(v));
            out.sort((a, b) => a.term.localeCompare(b.term));
            setEntries(out);
        };
        update();
        map.observe(update);
        return () => map.unobserve(update);
    }, [doc]);
    return entries;
}
