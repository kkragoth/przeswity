/**
 * Exhaustive switch guard. Call in the default branch of a switch over a
 * discriminated union to get a compile-time error when a new variant is added
 * but not handled.
 */
export function assertNever(x: never): never {
    throw new Error(`Unhandled discriminant: ${String(x)}`);
}
