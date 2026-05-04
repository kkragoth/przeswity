import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import type { GlossaryEntry } from '@/editor/glossary/GlossaryHighlight';
import { makeId } from '@/editor/utils';

import { useEditorSession } from '@/containers/editor/EditorSessionProvider';

interface StoredEntry extends GlossaryEntry {
  id: string
  updatedAt: number
}

export function useGlossary(doc: Y.Doc): StoredEntry[] {
    const [entries, setEntries] = useState<StoredEntry[]>([]);
    useEffect(() => {
        const map = doc.getMap('glossary') as Y.Map<StoredEntry>;
        const update = () => {
            const out: StoredEntry[] = [];
            map.forEach((v) => out.push(v));
            out.sort((a, b) => a.term.localeCompare(b.term));
            setEntries(out);
        };
        update();
        map.observe(update);
        return () => map.unobserve(update);
    }, [doc]);
    return entries;
}

export function GlossaryPanel() {
    const { t } = useTranslation('editor');
    const { collab } = useEditorSession();
    const doc = collab.doc;
    const entries = useGlossary(doc);
    const [draft, setDraft] = useState<{ term: string; translation: string; notes: string }>({
        term: '',
        translation: '',
        notes: '',
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const map = () => doc.getMap('glossary') as Y.Map<StoredEntry>;

    const save = () => {
        const term = draft.term.trim();
        if (!term) return;
        if (editingId) {
            const e = map().get(editingId);
            if (e) {
                map().set(editingId, {
                    ...e,
                    term,
                    translation: draft.translation.trim(),
                    notes: draft.notes.trim() || undefined,
                    updatedAt: Date.now(),
                });
            }
        } else {
            const id = makeId();
            map().set(id, {
                id,
                term,
                translation: draft.translation.trim(),
                notes: draft.notes.trim() || undefined,
                updatedAt: Date.now(),
            });
        }
        setDraft({ term: '', translation: '', notes: '' });
        setEditingId(null);
    };

    const remove = (id: string) => {
        map().delete(id);
        if (editingId === id) {
            setEditingId(null);
            setDraft({ term: '', translation: '', notes: '' });
        }
    };

    const startEdit = (e: StoredEntry) => {
        setEditingId(e.id);
        setDraft({ term: e.term, translation: e.translation, notes: e.notes ?? '' });
    };

    return (
        <div className="sidebar glossary-panel">
            <div className="sidebar-title">{t('glossary.title')}</div>
            <div className="glossary-form">
                <input
                    type="text"
                    placeholder={t('glossary.placeholderTerm')}
                    value={draft.term}
                    onChange={(e) => setDraft((d) => ({ ...d, term: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <input
                    type="text"
                    placeholder={t('glossary.placeholderTranslation')}
                    value={draft.translation}
                    onChange={(e) => setDraft((d) => ({ ...d, translation: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <input
                    type="text"
                    placeholder={t('glossary.placeholderNotes')}
                    value={draft.notes}
                    onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save();
                    }}
                />
                <div className="glossary-actions">
                    <button
                        type="button"
                        onClick={save}
                        disabled={!draft.term.trim()}
                        className="btn-primary"
                    >
                        {editingId ? t('glossary.save') : t('glossary.add')}
                    </button>
                    {editingId && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingId(null);
                                setDraft({ term: '', translation: '', notes: '' });
                            }}
                        >
                            {t('glossary.cancel')}
                        </button>
                    )}
                </div>
            </div>
            {entries.length === 0 ? (
                <div className="sidebar-empty">{t('glossary.empty')}</div>
            ) : (
                entries.map((e) => (
                    <div key={e.id} className={`glossary-entry${editingId === e.id ? ' is-editing' : ''}`}>
                        <div className="glossary-row">
                            <span className="glossary-term-label">{e.term}</span>
                            <span className="glossary-arrow">→</span>
                            <span className="glossary-translation">{e.translation || '—'}</span>
                        </div>
                        {e.notes && <div className="glossary-notes">{e.notes}</div>}
                        <div className="glossary-buttons">
                            <button type="button" onClick={() => startEdit(e)}>
                                {t('glossary.edit')}
                            </button>
                            <button type="button" className="btn-danger" onClick={() => remove(e.id)}>
                                {t('glossary.delete')}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
