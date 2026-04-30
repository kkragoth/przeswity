export function isImmersiveRoute(pathname: string): boolean {
    return /^\/books\/[^/]+$/.test(pathname);
}
