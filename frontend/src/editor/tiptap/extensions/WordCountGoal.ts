import { Extension } from '@tiptap/core';

export interface WordCountGoalOptions {
    dailyGoal: number;
    totalGoal: number;
    getWordCount: () => number;
}

export const WordCountGoal = Extension.create<WordCountGoalOptions>({
    name: 'wordCountGoal',

    addOptions(): WordCountGoalOptions {
        return { dailyGoal: 0, totalGoal: 0, getWordCount: () => 0 };
    },

    addStorage() {
        return {
            sessionStart: Date.now(),
            wordsAtSessionStart: 0,
        };
    },

    onCreate() {
        this.storage.wordsAtSessionStart = this.options.getWordCount();
    },
});
