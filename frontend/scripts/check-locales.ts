import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'src', 'locales');
const NAMESPACES = ['common', 'auth', 'admin', 'coordinator', 'editor', 'errors'];
const LOCALES = ['pl', 'en', 'ua'];

const WRITE_STUB = process.argv.includes('--write-stub');

// Collect all leaf key→value pairs, including empty-value detection.
function flattenWithValues(
    obj: Record<string, unknown>,
    prefix = '',
): Array<{ key: string; value: unknown }> {
    const out: Array<{ key: string; value: unknown }> = [];
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            out.push(...flattenWithValues(v as Record<string, unknown>, key));
        } else {
            out.push({ key, value: v });
        }
    }
    return out;
}

// Detect duplicate keys within the same JSON object scope.
// Uses a custom JSON tokenizer that walks opening/closing braces to track scope depth,
// detecting any property name that appears more than once as a direct child of the same object.
function detectDuplicateKeys(raw: string): string[] {
    const duplicates: string[] = [];
    // Stack of Sets; each Set holds keys seen in the current object scope.
    const scopeStack: Set<string>[] = [];
    // Simple tokenizer: walk char by char, tracking string boundaries and braces.
    let i = 0;
    const n = raw.length;

    function skipString(): void {
        i++; // skip opening "
        while (i < n) {
            if (raw[i] === '\\') { i += 2; continue; }
            if (raw[i] === '"') { i++; return; }
            i++;
        }
    }

    while (i < n) {
        const ch = raw[i];
        if (ch === '{') {
            scopeStack.push(new Set<string>());
            i++;
        } else if (ch === '}') {
            scopeStack.pop();
            i++;
        } else if (ch === '"') {
            // Capture the string value
            const start = i + 1;
            skipString();
            const str = raw.slice(start, i - 1);
            // Check if this string is used as an object key (followed by ':' after optional whitespace)
            let j = i;
            while (j < n && (raw[j] === ' ' || raw[j] === '\t' || raw[j] === '\r' || raw[j] === '\n')) j++;
            if (raw[j] === ':' && scopeStack.length > 0) {
                const scope = scopeStack[scopeStack.length - 1];
                if (scope.has(str)) {
                    if (!duplicates.includes(str)) duplicates.push(str);
                } else {
                    scope.add(str);
                }
            }
        } else {
            i++;
        }
    }

    return duplicates;
}

// Deep-set a dotted key path in a nested object, creating intermediary objects.
function deepSet(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
    const parts = dotPath.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (typeof cur[p] !== 'object' || cur[p] === null) {
            cur[p] = {};
        }
        cur = cur[p] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
}

// Get a leaf value by dotted path from a nested object.
function deepGet(obj: Record<string, unknown>, dotPath: string): unknown {
    const parts = dotPath.split('.');
    let cur: unknown = obj;
    for (const p of parts) {
        if (typeof cur !== 'object' || cur === null) return undefined;
        cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
}

let failed = false;

for (const ns of NAMESPACES) {
    const plFile = path.join(root, 'pl', `${ns}.json`);
    const plRaw = fs.readFileSync(plFile, 'utf8');
    const plData = JSON.parse(plRaw) as Record<string, unknown>;
    const plEntries = flattenWithValues(plData);
    const plKeys = new Set(plEntries.map((e) => e.key));

    // Check Polish file for empty values and duplicates.
    for (const { key, value } of plEntries) {
        if (value === '') {
            failed = true;
            console.error(`[locales] pl/${ns}.json — empty value for key: ${key}`);
        }
    }
    const plDups = detectDuplicateKeys(plRaw);
    if (plDups.length) {
        failed = true;
        console.error(`[locales] pl/${ns}.json — duplicate keys: ${plDups.join(', ')}`);
    }

    for (const lng of LOCALES) {
        if (lng === 'pl') continue;

        const file = path.join(root, lng, `${ns}.json`);
        const raw = fs.readFileSync(file, 'utf8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        const entries = flattenWithValues(data);
        const keys = new Set(entries.map((e) => e.key));

        // Check for empty values.
        for (const { key, value } of entries) {
            if (value === '') {
                failed = true;
                console.error(`[locales] ${lng}/${ns}.json — empty value for key: ${key}`);
            }
        }

        // Check for duplicate keys.
        const dups = detectDuplicateKeys(raw);
        if (dups.length) {
            failed = true;
            console.error(`[locales] ${lng}/${ns}.json — duplicate keys: ${dups.join(', ')}`);
        }

        const missing = [...plKeys].filter((k) => !keys.has(k));
        const extra = [...keys].filter((k) => !plKeys.has(k));

        if (missing.length || extra.length) {
            if (WRITE_STUB && missing.length) {
                // Fill missing keys using Polish text + " // TODO translate" suffix.
                // The suffix is appended to the string value so it is visible in the
                // file without adding extra JSON keys (which would break key-set parity).
                for (const key of missing) {
                    const plValue = deepGet(plData, key);
                    const stub = typeof plValue === 'string'
                        ? `${plValue} // TODO translate`
                        : String(plValue ?? '') + ' // TODO translate';
                    deepSet(data, key, stub);
                }
                fs.writeFileSync(file, JSON.stringify(data, null, 4) + '\n', 'utf8');
                console.warn(`[locales] ${lng}/${ns}.json — wrote ${missing.length} stub(s)`);
            } else {
                failed = true;
                console.error(`[locales] ${lng}/${ns}.json — missing: ${missing.join(',')} | extra: ${extra.join(',')}`);
            }
        }
    }
}

if (failed) process.exit(1);
process.stdout.write('[locales] all namespaces match.\n');
