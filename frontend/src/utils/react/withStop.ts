export function withStop<E extends { stopPropagation(): void }>(cb: () => void): (e: E) => void {
    return (e) => { e.stopPropagation(); cb(); };
}
