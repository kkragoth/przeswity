import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';

import { useEditorSession } from '@/containers/editor/EditorSessionProvider';

interface DocumentMeta {
  title?: string
  isbn?: string
  targetWords?: number
  deadline?: string
  notes?: string
}

// STATUS_OPTIONS removed — book stage lives on the API row (see docs/refactor-frontend.md Phase 23)

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

export function MetaPanel() {
    const { t } = useTranslation('editor');
    const { collab } = useEditorSession();
    const doc = collab.doc;
    const meta = useMeta(doc);
    const map = doc.getMap('meta') as Y.Map<unknown>;

    const set = (k: keyof DocumentMeta, v: unknown) => {
        if (v === '' || v === undefined || v === null) map.delete(k as string);
        else map.set(k as string, v);
    };

    return (
        <div className="sidebar meta-panel">
            <div className="sidebar-title">{t('meta.title')}</div>
            <div className="meta-form">
                <label className="meta-field">
                    <span>{t('meta.fieldTitle')}</span>
                    <input
                        type="text"
                        value={meta.title ?? ''}
                        placeholder={t('meta.placeholderTitle')}
                        onChange={(e) => set('title', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>{t('meta.fieldIsbn')}</span>
                    <input
                        type="text"
                        value={meta.isbn ?? ''}
                        placeholder={t('meta.placeholderIsbn')}
                        onChange={(e) => set('isbn', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>{t('meta.fieldTargetWords')}</span>
                    <input
                        type="number"
                        min={0}
                        value={meta.targetWords ?? ''}
                        placeholder={t('meta.placeholderTargetWords')}
                        onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            set('targetWords', isNaN(n) ? undefined : n);
                        }}
                    />
                </label>
                <label className="meta-field">
                    <span>{t('meta.fieldDeadline')}</span>
                    <input
                        type="date"
                        value={meta.deadline ?? ''}
                        onChange={(e) => set('deadline', e.target.value)}
                    />
                </label>
                <label className="meta-field">
                    <span>{t('meta.fieldNotes')}</span>
                    <textarea
                        value={meta.notes ?? ''}
                        placeholder={t('meta.placeholderNotes')}
                        rows={4}
                        onChange={(e) => set('notes', e.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}
