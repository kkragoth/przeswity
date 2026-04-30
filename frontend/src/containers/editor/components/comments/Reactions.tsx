import { useState } from 'react';

const QUICK = ['👍', '❤️', '🎉', '✅', '🤔', '❓', '🚀'];

interface ReactionsProps {
  reactions: Record<string, string[]> | undefined
  myUserId: string
  onToggle: (emoji: string) => void
}

export function Reactions({ reactions, myUserId, onToggle }: ReactionsProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const entries = Object.entries(reactions ?? {}).filter(([, ids]) => ids.length > 0);

    return (
        <div className={`reactions${pickerOpen ? ' is-picker-open' : ''}`} onClick={(e) => e.stopPropagation()}>
            {entries.map(([emoji, ids]) => {
                const mine = ids.includes(myUserId);
                return (
                    <button
                        key={emoji}
                        type="button"
                        className={`reaction${mine ? ' is-mine' : ''}`}
                        onClick={() => onToggle(emoji)}
                        title={ids.length === 1 ? '1 reaction' : `${ids.length} reactions`}
                    >
                        <span className="reaction-emoji">{emoji}</span>
                        <span className="reaction-count">{ids.length}</span>
                    </button>
                );
            })}
            <button
                type="button"
                className="reaction reaction-add"
                onClick={() => setPickerOpen((v) => !v)}
                title="Add reaction"
            >
        ＋
            </button>
            {pickerOpen && (
                <div className="reaction-picker" onMouseLeave={() => setPickerOpen(false)}>
                    {QUICK.map((e) => (
                        <button
                            key={e}
                            type="button"
                            className="reaction-pick"
                            onClick={() => {
                                onToggle(e);
                                setPickerOpen(false);
                            }}
                        >
                            {e}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
