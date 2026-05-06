import { useMemo } from 'react';
import type { Editor } from '@tiptap/react';

export interface WordCountGoalState {
    total: number;
    sessionWords: number;
    dailyProgress: number;  // 0–1
    totalProgress: number;  // 0–1
    dailyGoal: number;
    totalGoal: number;
}

export function useWordCountGoal(editor: Editor | null, dailyGoal: number, totalGoal: number): WordCountGoalState {
    return useMemo(() => {
        if (!editor) return { total: 0, sessionWords: 0, dailyProgress: 0, totalProgress: 0, dailyGoal, totalGoal };
        const total = editor.storage.characterCount?.words?.() ?? 0;
        const goalStorage = (editor.storage as unknown as { wordCountGoal?: { wordsAtSessionStart: number } }).wordCountGoal;
        const wordsAtStart = goalStorage?.wordsAtSessionStart ?? 0;
        const sessionWords = Math.max(0, total - wordsAtStart);
        return {
            total,
            sessionWords,
            dailyProgress: dailyGoal > 0 ? Math.min(1, sessionWords / dailyGoal) : 0,
            totalProgress: totalGoal > 0 ? Math.min(1, total / totalGoal) : 0,
            dailyGoal,
            totalGoal,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, editor?.state, dailyGoal, totalGoal]);
}
