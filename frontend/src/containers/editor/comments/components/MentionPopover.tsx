import type { MentionCandidate } from '../hooks/useMentionDetection';

interface MentionPopoverProps {
    candidates: MentionCandidate[]
    activeIdx: number
    onHover: (idx: number) => void
    onSelect: (display: string) => void
}

export function MentionPopover({ candidates, activeIdx, onHover, onSelect }: MentionPopoverProps) {
    return (
        <div className="mention-picker" onMouseDown={(e) => e.preventDefault()}>
            {candidates.slice(0, 8).map((c, i) => (
                <button
                    type="button"
                    key={c.kind + c.display}
                    className={`mention-pick${i === activeIdx ? ' is-active' : ''}`}
                    onMouseEnter={() => onHover(i)}
                    onClick={() => onSelect(c.display)}
                >
                    <span className="mention-pick-symbol">@</span>
                    <span className="mention-pick-name">{c.display}</span>
                    <span className="mention-pick-kind">{c.kind}</span>
                </button>
            ))}
        </div>
    );
}
