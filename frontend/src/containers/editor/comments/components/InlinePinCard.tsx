import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { Avatar } from '@/editor/shell/Avatar';
import { PinsMode } from '@/containers/editor/session/paneStore';
import { withStop } from '@/utils/react/withStop';
import type { PinAnchor } from '../hooks/useCommentPinPositions';

interface InlinePinCardProps {
    pin: PinAnchor;
    isActive: boolean;
    mode: PinsMode;
    preview?: string;
    onClick: (id: string) => void;
    onClose?: () => void;
    onReply?: (id: string) => void;
    onResolve?: (id: string) => void;
}

function arePinsEqual(a: InlinePinCardProps, b: InlinePinCardProps): boolean {
    return a.isActive === b.isActive
        && a.mode === b.mode
        && a.preview === b.preview
        && a.onClick === b.onClick
        && a.onClose === b.onClose
        && a.onReply === b.onReply
        && a.onResolve === b.onResolve
        && a.pin.id === b.pin.id
        && a.pin.top === b.pin.top
        && a.pin.replies === b.pin.replies
        && a.pin.authorName === b.pin.authorName
        && a.pin.authorColor === b.pin.authorColor;
}

export const InlinePinCard = memo(function InlinePinCard({
    pin,
    isActive,
    mode,
    preview,
    onClick,
    onClose,
    onReply,
    onResolve,
}: InlinePinCardProps) {
    const { t } = useTranslation('editor');
    const title = `${pin.authorName}${pin.replies > 0 ? ` · ${t('comments.repliesCount', { count: pin.replies })}` : ''}`;
    const handleSelect = () => onClick(pin.id);

    if (mode === PinsMode.Avatars) {
        return (
            <button
                type="button"
                className={`comment-pin${isActive ? ' is-active' : ''}`}
                style={{ top: pin.top }}
                onClick={(e) => { e.stopPropagation(); handleSelect(); }}
                title={title}
            >
                <Avatar name={pin.authorName} color={pin.authorColor} size="sm" ring={isActive} badge={pin.replies > 0 ? pin.replies : undefined} />
            </button>
        );
    }

    // Card mode uses a `<div role="button">` instead of `<button>` so it can
    // host real `<button>` elements (reply / resolve) inside without violating
    // the HTML rule against nested interactive content.
    return (
        <div
            role="button"
            tabIndex={0}
            className={`comment-pin comment-pin--card${isActive ? ' is-active' : ''}`}
            style={{ top: pin.top }}
            // mousedown must be stopped here too — the editor-page's mousedown
            // handler runs `focusOnEmptyClick` which would scroll the editor to
            // doc end on any click that doesn't look like an interactive
            // element. (The native `<button>` form was excluded by the
            // `closest('button')` check; a `div[role=button]` isn't.)
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleSelect(); }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect();
                }
            }}
            title={title}
        >
            <div className="pin-card-header">
                <Avatar name={pin.authorName} color={pin.authorColor} size="xs" />
                <span className="pin-card-author" style={{ color: pin.authorColor }}>{pin.authorName}</span>
                {/* When active, the chevron-up close button takes the slot
                    where the reply count chip otherwise sits — same affordance
                    as the sidebar thread header. */}
                {isActive && onClose ? (
                    <button
                        type="button"
                        className="pin-card-close"
                        onClick={withStop(onClose)}
                        title={t('comments.close')}
                        aria-label={t('comments.close')}
                    >
                        <ChevronUp size={13} strokeWidth={2.25} />
                    </button>
                ) : pin.replies > 0 ? (
                    <span className="pin-card-replies">{pin.replies}</span>
                ) : null}
            </div>
            {preview && (
                <div className="pin-card-preview">{preview}</div>
            )}
            {isActive && (onReply || onResolve) && (
                <div className="pin-card-actions">
                    {onReply && (
                        <button
                            type="button"
                            className="pin-card-action"
                            onClick={withStop(() => onReply(pin.id))}
                            title={t('comments.reply')}
                            aria-label={t('comments.reply')}
                        >
                            <MessageSquarePlus size={13} strokeWidth={2.25} />
                            <span>{t('comments.reply')}</span>
                        </button>
                    )}
                    {onResolve && (
                        <button
                            type="button"
                            className="pin-card-action pin-card-action--resolve"
                            onClick={withStop(() => onResolve(pin.id))}
                            title={t('comments.resolve')}
                            aria-label={t('comments.resolve')}
                        >
                            <Check size={13} strokeWidth={2.5} />
                            <span>{t('comments.resolve')}</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}, arePinsEqual);
