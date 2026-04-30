import { FONT_VARIANTS } from '@/editor/io/typography';

interface DocxFont {
    name: string;
    data: Buffer;
}

let fontBytesCache: Promise<DocxFont[]> | null = null;

export async function loadFontBytes(): Promise<DocxFont[]> {
    if (!fontBytesCache) {
        fontBytesCache = Promise.all(
            FONT_VARIANTS.map(async (v) => {
                const resp = await fetch(v.file);
                if (!resp.ok) throw new Error(`Failed to load font ${v.file}: ${resp.status}`);
                const bytes = new Uint8Array(await resp.arrayBuffer());
                return { name: v.family, data: bytes as unknown as Buffer };
            }),
        );
    }
    return fontBytesCache;
}
