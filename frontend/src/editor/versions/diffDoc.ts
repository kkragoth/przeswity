export interface JSONNode {
  type: string
  attrs?: Record<string, unknown>
  content?: JSONNode[]
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  text?: string
}

interface TextOp {
  type: 'eq' | 'ins' | 'del'
  text: string
}

const LCS_CAP = 5_000_000;

const insMark = () => ({
    type: 'insertion',
    attrs: {
        suggestionId: 'diff',
        authorId: 'diff',
        authorName: 'newer',
        authorColor: '#15803d',
        timestamp: 0,
    },
});

const delMark = () => ({
    type: 'deletion',
    attrs: {
        suggestionId: 'diff',
        authorId: 'diff',
        authorName: 'older',
        authorColor: '#9ca3af',
        timestamp: 0,
    },
});

function tokenize(s: string): string[] {
    return s.match(/\S+|\s+/g) ?? [];
}

function lcsDiff(a: string[], b: string[]): TextOp[] {
    const n = a.length;
    const m = b.length;

    if (n === 0 && m === 0) return [];
    if (n === 0) return [{ type: 'ins', text: b.join('') }];
    if (m === 0) return [{ type: 'del', text: a.join('') }];
    if (n * m > LCS_CAP) {
        return [
            { type: 'del', text: a.join('') },
            { type: 'ins', text: b.join('') },
        ];
    }

    const dp: Uint32Array[] = [];
    for (let i = 0; i <= n; i++) dp.push(new Uint32Array(m + 1));
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }

    const out: TextOp[] = [];
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            out.push({ type: 'eq', text: a[i - 1] });
            i--;
            j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            out.push({ type: 'del', text: a[i - 1] });
            i--;
        } else {
            out.push({ type: 'ins', text: b[j - 1] });
            j--;
        }
    }
    while (i > 0) {
        out.push({ type: 'del', text: a[i - 1] });
        i--;
    }
    while (j > 0) {
        out.push({ type: 'ins', text: b[j - 1] });
        j--;
    }
    return out.reverse();
}

function compact(ops: TextOp[]): TextOp[] {
    const out: TextOp[] = [];
    for (const op of ops) {
        const last = out[out.length - 1];
        if (last && last.type === op.type) last.text += op.text;
        else out.push({ ...op });
    }
    return out;
}

function blockText(node: JSONNode): string {
    if (node.type === 'text') return node.text ?? '';
    return (node.content ?? []).map(blockText).join('');
}

function inlineDiffContent(aText: string, bText: string): JSONNode[] {
    if (aText === '' && bText === '') return [];
    if (aText === bText) return [{ type: 'text', text: aText }];
    const ops = compact(lcsDiff(tokenize(aText), tokenize(bText)));
    const result: JSONNode[] = [];
    for (const op of ops) {
        if (!op.text) continue;
        if (op.type === 'eq') result.push({ type: 'text', text: op.text });
        else if (op.type === 'ins') result.push({ type: 'text', text: op.text, marks: [insMark()] });
        else result.push({ type: 'text', text: op.text, marks: [delMark()] });
    }
    return result;
}

function wrapAllText(node: JSONNode, mark: ReturnType<typeof insMark>): JSONNode {
    if (node.type === 'text') {
        const next = { ...node, marks: [...(node.marks ?? []), mark] };
        return next;
    }
    if (!node.content) return node;
    return { ...node, content: node.content.map((c) => wrapAllText(c, mark)) };
}

function diffBlock(a: JSONNode | null, b: JSONNode | null): JSONNode[] {
    if (!a && !b) return [];
    if (!a) return [wrapAllText(b!, insMark())];
    if (!b) return [wrapAllText(a, delMark())];

    const sameType = a.type === b.type;
    const inlineable = sameType && (a.type === 'paragraph' || a.type === 'heading');

    if (inlineable) {
        const aText = blockText(a);
        const bText = blockText(b);
        const content = inlineDiffContent(aText, bText);
        return [
            {
                type: b.type,
                attrs: b.attrs,
                ...(content.length ? { content } : {}),
            },
        ];
    }

    if (sameType) {
        const aText = blockText(a);
        const bText = blockText(b);
        if (aText === bText) return [b];
        return [wrapAllText(a, delMark()), wrapAllText(b, insMark())];
    }

    return [wrapAllText(a, delMark()), wrapAllText(b, insMark())];
}

export function buildDiffDoc(a: JSONNode, b: JSONNode): JSONNode {
    const aBlocks = a.content ?? [];
    const bBlocks = b.content ?? [];
    const max = Math.max(aBlocks.length, bBlocks.length);
    const merged: JSONNode[] = [];
    for (let i = 0; i < max; i++) {
        merged.push(...diffBlock(aBlocks[i] ?? null, bBlocks[i] ?? null));
    }
    if (merged.length === 0) merged.push({ type: 'paragraph' });
    return { type: 'doc', content: merged };
}

export function diffStats(diff: JSONNode): { ins: number; del: number } {
    let ins = 0;
    let del = 0;
    const visit = (n: JSONNode) => {
        if (n.type === 'text') {
            const m = n.marks ?? [];
            const len = (n.text ?? '').length;
            if (m.some((mk) => mk.type === 'insertion')) ins += len;
            if (m.some((mk) => mk.type === 'deletion')) del += len;
        }
        ;(n.content ?? []).forEach(visit);
    };
    visit(diff);
    return { ins, del };
}
