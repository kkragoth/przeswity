import { useCallback, useMemo, useState } from 'react';

export enum MentionKind {
    User = 'user',
    Role = 'role',
}

export interface MentionCandidate {
    display: string
    kind: MentionKind
}

export function useMentionDetection(candidates: MentionCandidate[]) {
    const [picker, setPicker] = useState<{ from: number; query: string } | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);

    const filtered = useMemo(
        () => picker
            ? candidates.filter((c) => c.display.toLowerCase().startsWith(picker.query.toLowerCase()))
            : [],
        [picker, candidates],
    );

    const detect = useCallback((text: string, caret: number) => {
        const before = text.slice(0, caret);
        const m = before.match(/@([\p{L}\p{N}_-]*)$/u);
        if (m) {
            const at = caret - m[0].length;
            const prev = at === 0 ? '' : text[at - 1];
            if (at === 0 || /\s/.test(prev)) {
                setPicker({ from: at, query: m[1] });
                setActiveIdx(0);
                return;
            }
        }
        setPicker((current) => (current ? null : current));
    }, []);

    const closePicker = useCallback(() => setPicker(null), []);

    return { picker, filtered, activeIdx, setActiveIdx, detect, closePicker };
}
