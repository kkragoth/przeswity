// Drizzle's `bytea` custom type expects Uint8Array, but Buffer is a Uint8Array subclass at
// runtime. The `as unknown as Uint8Array` cast is needed because Buffer's TypeScript type
// is not structurally assignable to Uint8Array in some lib versions. Centralised so the
// cast lives in one place.
export const asByteaInput = (state: Uint8Array): Uint8Array =>
    Buffer.from(state) as unknown as Uint8Array;
