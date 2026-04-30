export interface JSONNode {
    type: string;
    attrs?: Record<string, unknown>;
    content?: JSONNode[];
    marks?: { type: string; attrs?: Record<string, unknown> }[];
    text?: string;
}

export interface JSONDoc extends JSONNode {
    type: 'doc';
}

export interface JSONInline extends JSONNode {
    type: 'text' | 'hardBreak';
}
