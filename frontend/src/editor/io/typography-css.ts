import { TYPOGRAPHY, FONT_FAMILIES, ptToPx, type BlockKind } from '@/editor/io/typography';

const VAR_BLOCKS: BlockKind[] = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'listItem'];

export function applyTypographyToCssVars(target: HTMLElement = document.documentElement): void {
    target.style.setProperty('--font-body', `'${FONT_FAMILIES.serif}', Georgia, serif`);
    target.style.setProperty('--font-display', `'${FONT_FAMILIES.serif}', Georgia, serif`);
    target.style.setProperty('--font-ui',   `'${FONT_FAMILIES.sans}', -apple-system, sans-serif`);
    target.style.setProperty('--font-mono', `'${FONT_FAMILIES.mono}', Menlo, Consolas, monospace`);

    for (const kind of VAR_BLOCKS) {
        const t = TYPOGRAPHY[kind];
        target.style.setProperty(`--ed-${kind}-fs`, `${ptToPx(t.sizePt)}px`);
        target.style.setProperty(`--ed-${kind}-lh`, String(t.lineHeight));
        target.style.setProperty(`--ed-${kind}-fw`, t.bold ? '700' : '400');
        target.style.setProperty(`--ed-${kind}-fst`, t.italic ? 'italic' : 'normal');
        target.style.setProperty(`--ed-${kind}-mt`, `${ptToPx(t.spaceBeforePt)}px`);
        target.style.setProperty(`--ed-${kind}-mb`, `${ptToPx(t.spaceAfterPt)}px`);
        target.style.setProperty(`--ed-${kind}-indent`, `${ptToPx(t.indentPt)}px`);
    }

    target.style.setProperty('--content-fs', `${ptToPx(TYPOGRAPHY.body.sizePt)}px`);
    target.style.setProperty('--content-lh', String(TYPOGRAPHY.body.lineHeight));
}
