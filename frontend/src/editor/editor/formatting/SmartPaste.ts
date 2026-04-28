import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const ATTR_STRIP = ['style', 'class', 'color', 'face', 'size', 'bgcolor', 'face', 'lang'];
const TAGS_TO_UNWRAP = new Set(['FONT', 'SPAN']);

function clean(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('*').forEach((el) => {
        for (const attr of ATTR_STRIP) el.removeAttribute(attr);
        Array.from(el.attributes).forEach((a) => {
            if (a.name.startsWith('on')) el.removeAttribute(a.name);
        });
    });
    // Unwrap tags that no longer carry meaning
    tmp.querySelectorAll('font, span').forEach((el) => {
        if (!TAGS_TO_UNWRAP.has(el.tagName)) return;
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
    });
    return tmp.innerHTML;
}

export const SmartPaste = Extension.create({
    name: 'smartPaste',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('smartPaste'),
                props: {
                    transformPastedHTML(html) {
                        return clean(html);
                    },
                },
            }),
        ];
    },
});
