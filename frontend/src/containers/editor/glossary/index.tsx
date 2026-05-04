import { useState } from 'react';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import { makeId } from '@/editor/utils';

import { useEditorSession } from '@/containers/editor/session/SessionProvider';
import { useGlossary, type StoredEntry } from './hooks/useGlossary';
import { GlossaryEntryForm, type GlossaryDraft } from './components/GlossaryEntryForm';
import { GlossaryEntryList } from './components/GlossaryEntryList';

const EMPTY_DRAFT: GlossaryDraft = { term: '', translation: '', notes: '' };

export function GlossaryPanel() {
    const { t } = useTranslation('editor');
    const { collab } = useEditorSession();
    const doc = collab.doc;
    const entries = useGlossary(doc);
    const [draft, setDraft] = useState<GlossaryDraft>(EMPTY_DRAFT);
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
        setDraft(EMPTY_DRAFT);
        setEditingId(null);
    };

    const remove = (id: string) => {
        map().delete(id);
        if (editingId === id) {
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
        }
    };

    const startEdit = (e: StoredEntry) => {
        setEditingId(e.id);
        setDraft({ term: e.term, translation: e.translation, notes: e.notes ?? '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
    };

    return (
        <div className="sidebar glossary-panel">
            <div className="sidebar-title">{t('glossary.title')}</div>
            <GlossaryEntryForm
                draft={draft}
                isEditing={editingId !== null}
                onChange={setDraft}
                onSave={save}
                onCancel={cancelEdit}
            />
            <GlossaryEntryList
                entries={entries}
                editingId={editingId}
                onEdit={startEdit}
                onDelete={remove}
            />
        </div>
    );
}
