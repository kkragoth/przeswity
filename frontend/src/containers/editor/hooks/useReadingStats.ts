import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { computeReadingStats } from '@/editor/io/readingStats';

export interface ReadingStatsSummary {
  sentences: number
  paragraphs: number
  readingMinutes: number
}

const ZERO: ReadingStatsSummary = { sentences: 0, paragraphs: 0, readingMinutes: 0 };

export function useReadingStats(editor: Editor | null): ReadingStatsSummary {
    const [stats, setStats] = useState<ReadingStatsSummary>(ZERO);
    useEffect(() => {
        if (!editor) {
            setStats(ZERO);
            return;
        }
        const update = () => {
            const s = computeReadingStats(editor);
            setStats({
                sentences: s.sentences,
                paragraphs: s.paragraphs,
                readingMinutes: s.readingMinutes,
            });
        };
        update();
        editor.on('update', update);
        return () => {
            editor.off('update', update);
        };
    }, [editor]);
    return stats;
}
