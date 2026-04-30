import { Document, Footer, Header, Packer, Paragraph } from 'docx';
import type { Editor } from '@tiptap/react';
import { blockToParagraphs } from '@/editor/io/docx/blocks';
import { loadFontBytes } from '@/editor/io/docx/fonts';
import { buildHfParagraph } from '@/editor/io/docx/headerFooter';
import type { JSONNode } from '@/editor/types';
import { buildDocxPageProperties, buildDocxStyles } from '@/editor/io/typography';

export interface ExportOptions {
    acceptSuggestions: boolean;
    headerLeft?: string;
    headerRight?: string;
    footerLeft?: string;
    footerRight?: string;
}

export async function editorToDocxBlob(editor: Editor, opts: ExportOptions = { acceptSuggestions: true }): Promise<Blob> {
    const json = editor.getJSON() as JSONNode;
    const paragraphs: Paragraph[] = (json.content ?? []).flatMap((b) => blockToParagraphs(b, opts));
    const headerLeft = opts.headerLeft ?? '';
    const headerRight = opts.headerRight ?? '';
    const footerLeft = opts.footerLeft ?? '';
    const footerRight = opts.footerRight ?? '';
    const pageProperties = buildDocxPageProperties();
    const contentWidthTwips = pageProperties.size.width - pageProperties.margin.left - pageProperties.margin.right;
    const fonts = await loadFontBytes();

    const doc = new Document({
        fonts,
        styles: buildDocxStyles(),
        sections: [{
            properties: { page: { size: pageProperties.size, margin: pageProperties.margin } },
            headers: headerLeft || headerRight ? { default: new Header({ children: [buildHfParagraph(headerLeft, headerRight, contentWidthTwips)] }) } : undefined,
            footers: footerLeft || footerRight ? { default: new Footer({ children: [buildHfParagraph(footerLeft, footerRight, contentWidthTwips)] }) } : undefined,
            children: paragraphs,
        }],
    });
    return Packer.toBlob(doc);
}
