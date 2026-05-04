const PREVIEW_MAX = 90;

export function previewBody(body: string): string {
    const single = body.replace(/\s+/g, ' ').trim();
    if (single.length <= PREVIEW_MAX) return single;
    return single.slice(0, PREVIEW_MAX - 1) + '…';
}
