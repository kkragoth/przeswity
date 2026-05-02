import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { MentionTextarea, type MentionCandidate } from '@/containers/editor/components/comments/MentionTextarea';
import { withStop } from '@/utils/react/withStop';
import { useConfirmDialog } from '@/components/feedback/useConfirmDialog';
import { ConfirmDialogHost } from '@/components/feedback/ConfirmDialogHost';

interface ThreadReplyComposeProps {
    replyDraft: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onRemove: () => void;
    canResolve: boolean;
    candidates: MentionCandidate[];
}

export const ThreadReplyCompose = memo(function ThreadReplyCompose(props: ThreadReplyComposeProps) {
    const { t } = useTranslation('editor');
    const confirmDlg = useConfirmDialog();

    const handleRemove = async () => {
        const ok = await confirmDlg.confirm({ title: t('comments.deleteConfirm'), destructive: true });
        if (ok) props.onRemove();
    };

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
            {props.canResolve ? (
                <div className="thread-compose-footer">
                    <button
                        type="button"
                        className="thread-icon-btn thread-remove"
                        title={t('comments.deleteThread')}
                        aria-label={t('comments.deleteThread')}
                        onClick={withStop(() => void handleRemove())}
                    >🗑</button>
                </div>
            ) : null}
            <ConfirmDialogHost
                dialogState={confirmDlg.dialogState}
                onConfirm={confirmDlg.onConfirm}
                onCancel={confirmDlg.onCancel}
            />
        </div>
    );
});
