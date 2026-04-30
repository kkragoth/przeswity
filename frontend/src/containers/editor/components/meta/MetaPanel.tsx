import { useEffect, useState } from 'react';
import * as Y from 'yjs';

interface MetaPanelProps {
  doc: Y.Doc
}

interface DocumentMeta {
  title?: string
  isbn?: string
  targetWords?: number
  deadline?: string
  status?: string
  notes?: string
}

const STATUS_OPTIONS = ['draft', 'in-translation', 'in-edit', 'in-proof', 'composed', 'finalized'];

function useMeta(doc: Y.Doc): DocumentMeta {
    const [meta, setMeta] = useState<DocumentMeta>({});
    useEffect(() => {
        const map = doc.getMap('meta') as Y.Map<unknown>;
        const update = () => {
            const out: DocumentMeta = {};
            map.forEach((v, k) => {
                ;(out as unknown as Record<string, unknown>)[k] = v;
            });
            setMeta(out);
        };
        update();
        map.observe(update);
        return () => map.unobserve(update);
    }, [doc]);
    return meta;
}

export function MetaPanel({ doc }: MetaPanelProps) {
    const meta = useMeta(doc);
    const map = doc.getMap('meta') as Y.Map<unknown>;

    const set = (k: keyof DocumentMeta, v: unknown) => {
        if (v === '' || v === undefined || v === null) map.delete(k as string);
        else map.set(k as string, v);
    };

    return (
        <div className="sidebar meta-panel">
            <div className="sidebar-title">Document</div>
            <div className="meta-form">
                <label className="meta-field">
                    <span>Title</span>
                    <input
                        type="text"
                        value={meta.title ?? ''}
                        placeholder="Untitled document"
                        onChange={(e) => set('title', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>ISBN</span>
                    <input
                        type="text"
                        value={meta.isbn ?? ''}
                        placeholder="978-…"
                        onChange={(e) => set('isbn', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>Target words</span>
                    <input
                        type="number"
                        min={0}
                        value={meta.targetWords ?? ''}
                        placeholder="50000"
                        onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            set('targetWords', isNaN(n) ? undefined : n);
                        }}
                    />
                </label>
                <label className="meta-field">
                    <span>Deadline</span>
                    <input
                        type="date"
                        value={meta.deadline ?? ''}
                        onChange={(e) => set('deadline', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>Stage</span>
                    <select
                        value={meta.status ?? 'draft'}
                        onChange={(e) => set('status', e.target.value)}
                    >
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="meta-field">
                    <span>Notes</span>
                    <textarea
                        value={meta.notes ?? ''}
                        placeholder="Coordinator notes…"
                        rows={4}
                        onChange={(e) => set('notes', e.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}
