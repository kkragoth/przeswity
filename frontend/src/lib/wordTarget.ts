const TARGET_FILL_GREEN = '#16a34a';
const TARGET_FILL_AMBER = '#eab308';
const TARGET_FILL_NEUTRAL = 'var(--accent)';
const AMBER_THRESHOLD = 0.8;

export function wordTargetRatio(words: number, target: number): number {
    if (target <= 0) return 0;
    return words / target;
}

export function wordTargetPercentClamped(words: number, target: number): number {
    return Math.min(100, wordTargetRatio(words, target) * 100);
}

export function wordTargetPercentRounded(words: number, target: number): number {
    return Math.round(wordTargetRatio(words, target) * 100);
}

export function wordTargetFillColor(words: number, target: number): string {
    if (words >= target) return TARGET_FILL_GREEN;
    if (words >= target * AMBER_THRESHOLD) return TARGET_FILL_AMBER;
    return TARGET_FILL_NEUTRAL;
}
