import { useTranslation } from 'react-i18next';

export interface GlossaryDraft {
    term: string
    translation: string
    notes: string
}

interface GlossaryEntryFormProps {
    draft: GlossaryDraft
    isEditing: boolean
    onChange: (draft: GlossaryDraft) => void
    onSave: () => void
    onCancel: () => void
}

export function GlossaryEntryForm({ draft, isEditing, onChange, onSave, onCancel }: GlossaryEntryFormProps) {
    const { t } = useTranslation('editor');
    const update = (patch: Partial<GlossaryDraft>) => onChange({ ...draft, ...patch });
    const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') onSave();
    };
    return (
        <div className="glossary-form">
            <input
                type="text"
                placeholder={t('glossary.placeholderTerm')}
                value={draft.term}
                onChange={(e) => update({ term: e.target.value })}
                onKeyDown={onEnter}
            />
            <input
                type="text"
                placeholder={t('glossary.placeholderTranslation')}
                value={draft.translation}
                onChange={(e) => update({ translation: e.target.value })}
                onKeyDown={onEnter}
            />
            <input
                type="text"
                placeholder={t('glossary.placeholderNotes')}
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                onKeyDown={onEnter}
            />
            <div className="glossary-actions">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!draft.term.trim()}
                    className="btn-primary"
                >
                    {isEditing ? t('glossary.save') : t('glossary.add')}
                </button>
                {isEditing && (
                    <button type="button" onClick={onCancel}>
                        {t('glossary.cancel')}
                    </button>
                )}
            </div>
        </div>
    );
}
