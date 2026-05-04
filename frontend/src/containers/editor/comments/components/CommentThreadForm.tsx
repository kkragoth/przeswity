import { useTranslation } from 'react-i18next';
import { MentionTextarea } from './MentionTextarea';
import type { MentionCandidate } from './MentionTextarea';

export function CommentThreadForm({
    value,
    onChange,
    onSubmit,
    candidates,
    placeholderKey,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    candidates: MentionCandidate[];
    placeholderKey: 'comments.writeComment' | 'comments.writeReply' | 'comments.editComment' | 'comments.editReply';
}) {
    const { t } = useTranslation('editor');
    return (
        <div className="thread-draft">
            <MentionTextarea value={value} onChange={onChange} placeholder={t(placeholderKey)} autoFocus candidates={candidates} />
            <div className="thread-actions">
                <button type="button" className="btn-primary" onClick={onSubmit} disabled={!value.trim()}>{t('comments.post')}</button>
            </div>
        </div>
    );
}
