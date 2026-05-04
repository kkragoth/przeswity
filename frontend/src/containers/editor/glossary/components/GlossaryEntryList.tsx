import { useTranslation } from 'react-i18next';
import type { StoredEntry } from '../hooks/useGlossary';

interface GlossaryEntryListProps {
    entries: StoredEntry[]
    editingId: string | null
    onEdit: (entry: StoredEntry) => void
    onDelete: (id: string) => void
}

export function GlossaryEntryList({ entries, editingId, onEdit, onDelete }: GlossaryEntryListProps) {
    const { t } = useTranslation('editor');
    if (entries.length === 0) {
        return <div className="sidebar-empty">{t('glossary.empty')}</div>;
    }
    return (
        <>
            {entries.map((e) => (
                <div key={e.id} className={`glossary-entry${editingId === e.id ? ' is-editing' : ''}`}>
                    <div className="glossary-row">
                        <span className="glossary-term-label">{e.term}</span>
                        <span className="glossary-arrow">→</span>
                        <span className="glossary-translation">{e.translation || '—'}</span>
                    </div>
                    {e.notes && <div className="glossary-notes">{e.notes}</div>}
                    <div className="glossary-buttons">
                        <button type="button" onClick={() => onEdit(e)}>
                            {t('glossary.edit')}
                        </button>
                        <button type="button" className="btn-danger" onClick={() => onDelete(e.id)}>
                            {t('glossary.delete')}
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
}
