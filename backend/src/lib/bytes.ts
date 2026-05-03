// Drizzle's `bytea` custom type is declared as `Uint8Array`. `Buffer` is a Uint8Array
// subclass at runtime, but its TS declaration isn't structurally assignable to Uint8Array
// in some lib versions. Round-trip through `new Uint8Array(buffer, offset, length)` to
// hand back a plain Uint8Array view that satisfies the column type without any casts.
export const asByteaInput = (state: Uint8Array): Uint8Array => {
    const buf = Buffer.from(state);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};
