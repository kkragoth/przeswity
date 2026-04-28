import * as Y from 'yjs';
import { defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from 'y-prosemirror';
import { buildProseMirrorSchema, PROSEMIRROR_FIELD } from './index.js';

// prosemirror-markdown uses snake_case node names (basic-schema). Our Tiptap schema
// uses camelCase. Map between the two when crossing the markdown boundary.
const PM_TO_TIPTAP: Record<string, string> = {
    bullet_list: 'bulletList',
    ordered_list: 'orderedList',
    list_item: 'listItem',
    code_block: 'codeBlock',
    horizontal_rule: 'horizontalRule',
    hard_break: 'hardBreak',
};
const TIPTAP_TO_PM: Record<string, string> = Object.fromEntries(
    Object.entries(PM_TO_TIPTAP).map(([k, v]) => [v, k]),
);

type PMJson = { type: string; content?: PMJson[]; [k: string]: unknown };

function remapNodeTypes(json: PMJson, table: Record<string, string>): PMJson {
    const next: PMJson = { ...json, type: table[json.type] ?? json.type };
    if (Array.isArray(json.content)) {
        next.content = json.content.map((c) => remapNodeTypes(c, table));
    }
    return next;
}

export function markdownToYDocState(md: string): Uint8Array {
    const schema = buildProseMirrorSchema();
    const parsed = defaultMarkdownParser.parse(md);
    if (!parsed) throw new Error('markdown parse failed');
    const mapped = remapNodeTypes(parsed.toJSON() as PMJson, PM_TO_TIPTAP);
    const doc = schema.nodeFromJSON(mapped);
    const ydoc = prosemirrorJSONToYDoc(schema, doc.toJSON(), PROSEMIRROR_FIELD);
    return Y.encodeStateAsUpdate(ydoc);
}

export function yDocStateToMarkdown(state: Uint8Array): string {
    const schema = buildProseMirrorSchema();
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, state);
    const json = yDocToProsemirrorJSON(ydoc, PROSEMIRROR_FIELD) as PMJson;
    const mapped = remapNodeTypes(json, TIPTAP_TO_PM);
    // Build node against the basic markdown-serializer schema by re-using our schema's
    // node names after remap; defaultMarkdownSerializer reads node.type.name only.
    // Construct via the basic schema used by defaultMarkdownParser to ensure serializer
    // recognizes node names.
    const node = defaultMarkdownParser.schema.nodeFromJSON(mapped);
    return defaultMarkdownSerializer.serialize(node);
}
