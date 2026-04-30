// Shared DTO projection helpers. All API responses serialise Date -> ISO-8601 strings;
// these helpers keep the conversion in one place so every router uses the same format.

export const toIso = (d: Date | string | null | undefined): string | null =>
    d ? new Date(d).toISOString() : null;

export const toIsoOrThrow = (d: Date | string): string => new Date(d).toISOString();
