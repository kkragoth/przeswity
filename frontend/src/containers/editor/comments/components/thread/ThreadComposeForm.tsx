import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MentionTextarea, type MentionCandidate } from '../MentionTextarea';
import { withStop } from '@/utils/react/withStop';

interface ThreadComposeFormProps {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    onSubmit: () => void;
    onCancel: () => void;
    candidates: MentionCandidate[];
}

export const ThreadComposeForm = memo(function ThreadComposeForm(props: ThreadComposeFormProps) {
    const { t } = useTranslation('editor');
    return (
        <div className="thread-draft">
            <MentionTextarea
                value={props.value}
                onChange={props.onChange}
                placeholder={props.placeholder}
                autoFocus
                candidates={props.candidates}
                onClick={withStop(() => {})}
            />
            <div className="thread-actions">
                <button
                    type="button"
                    className="btn-primary"
                    disabled={!props.value.trim()}
                    onClick={withStop(props.onSubmit)}
                >{t('comments.post')}</button>
                <button type="button" onClick={withStop(props.onCancel)}>
                    {t('global.cancel')}
                </button>
            </div>
        </div>
    );
});
