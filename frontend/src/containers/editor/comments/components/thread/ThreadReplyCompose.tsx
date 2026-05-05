import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MentionTextarea, type MentionCandidate } from '../MentionTextarea';
import { withStop } from '@/utils/react/withStop';

interface ThreadReplyComposeProps {
    replyDraft: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    candidates: MentionCandidate[];
}

export const ThreadReplyCompose = memo(function ThreadReplyCompose(props: ThreadReplyComposeProps) {
    const { t } = useTranslation('editor');

    return (
        <div className="thread-reply-compose">
            <div className="thread-compose-row">
                <MentionTextarea
                    value={props.replyDraft}
                    onChange={props.onChange}
                    placeholder={t('comments.writeReply')}
                    candidates={props.candidates}
                    onClick={withStop(() => {})}
                />
                <button
                    type="button"
                    className="btn-send"
                    disabled={!props.replyDraft.trim()}
                    title={t('comments.reply')}
                    aria-label={t('comments.reply')}
                    onClick={withStop(props.onSubmit)}
                >↑</button>
            </div>
        </div>
    );
});
