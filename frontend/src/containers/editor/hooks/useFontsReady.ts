import { useEffect, useLayoutEffect, useState } from 'react';
import { applyTypographyToCssVars } from '@/editor/io/typography-css';
import type { FontVariant } from '@/editor/io/typography';

export function useFontsReady(fonts: FontVariant[]): boolean {
    const [fontsReady, setFontsReady] = useState(false);

    useLayoutEffect(() => {
        applyTypographyToCssVars();
    }, []);

    useEffect(() => {
        let cancelled = false;
        Promise.all(fonts.map((v) => document.fonts.load(`${v.weight} ${v.style} 16px '${v.family}'`))).then(() => {
            if (!cancelled) setFontsReady(true);
        });
        return () => { cancelled = true; };
    }, [fonts]);

    return fontsReady;
}
