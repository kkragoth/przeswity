import { colorFromName } from '../shell/Avatar';

export function authorColor(t: { authorColor?: string; authorName: string }): string {
    return t.authorColor ?? colorFromName(t.authorName);
}
