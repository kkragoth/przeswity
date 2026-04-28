import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', 'src', 'locales');
const NAMESPACES = ['common', 'auth', 'admin', 'coordinator', 'editor', 'errors'];
const LOCALES = ['pl', 'en', 'ua'];

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
    const out: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v as Record<string, unknown>, key));
        else out.push(key);
    }
    return out;
}

let failed = false;
for (const ns of NAMESPACES) {
    const plFile = path.join(root, 'pl', `${ns}.json`);
    const plKeys = new Set(flatten(JSON.parse(fs.readFileSync(plFile, 'utf8')) as Record<string, unknown>));
    for (const lng of LOCALES) {
        if (lng === 'pl') continue;
        const file = path.join(root, lng, `${ns}.json`);
        const keys = new Set(flatten(JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>));
        const missing = [...plKeys].filter((k) => !keys.has(k));
        const extra = [...keys].filter((k) => !plKeys.has(k));
        if (missing.length || extra.length) {
            failed = true;
            console.error(`[locales] ${lng}/${ns}.json — missing: ${missing.join(',')} | extra: ${extra.join(',')}`);
        }
    }
}
if (failed) process.exit(1);
console.log('[locales] all namespaces match.');
