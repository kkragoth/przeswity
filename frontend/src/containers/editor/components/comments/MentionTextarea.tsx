import { useLayoutEffect, useRef } from 'react';
import { ALL_ROLES } from '@/editor/identity/types';
import { MentionKind, useMentionDetection, type MentionCandidate } from '@/containers/editor/hooks/useMentionDetection';

export type { MentionCandidate } from '@/containers/editor/hooks/useMentionDetection';

interface MentionTextareaProps {
    value: string
    onChange: (next: string) => void
    placeholder?: string
    autoFocus?: boolean
    candidates: MentionCandidate[]
    onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void
}

export function buildCandidates(peers: { name: string }[], selfName: string): MentionCandidate[] {
    const namesSeen = new Set<string>();
    const out: MentionCandidate[] = [];
    for (const p of peers) {
        if (p.name === selfName) continue;
        if (namesSeen.has(p.name)) continue;
        namesSeen.add(p.name);
        out.push({ display: p.name, kind: MentionKind.User });
    }
    for (const r of ALL_ROLES) out.push({ display: r, kind: MentionKind.Role });
    return out;
}

export function renderBodyWithMentions(body: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    const re = /@([\p{L}\p{N}_-]+)/gu;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(body)) !== null) {
        if (m.index > last) parts.push(body.slice(last, m.index));
        const isRole = (ALL_ROLES as string[]).includes(m[1]);
        parts.push(
            <span key={`m-${i++}`} className={`mention${isRole ? ' mention-role' : ''}`}>
                @{m[1]}
            </span>,
        );
        last = m.index + m[0].length;
    }
    if (last < body.length) parts.push(body.slice(last));
    return parts;
}

export function MentionTextarea({
    value,
    onChange,
    placeholder,
    autoFocus,
    candidates,
    onClick,
}: MentionTextareaProps) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const { picker, filtered, activeIdx, setActiveIdx, detect, closePicker } = useMentionDetection(candidates);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        detect(e.target.value, e.target.selectionStart);
    };

    const insertMention = (display: string) => {
        if (!picker || !ref.current) return;
        const caret = ref.current.selectionStart;
        const next = value.slice(0, picker.from) + '@' + display + ' ' + value.slice(caret);
        onChange(next);
        closePicker();
        requestAnimationFrame(() => {
            if (!ref.current) return;
            const newCaret = picker.from + 1 + display.length + 1;
            ref.current.focus();
            ref.current.setSelectionRange(newCaret, newCaret);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!picker || filtered.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => (i + 1) % filtered.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            insertMention(filtered[activeIdx].display);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closePicker();
        }
    };

    useLayoutEffect(() => {
        if (autoFocus && ref.current) ref.current.focus();
    }, [autoFocus]);

    return (
        <div className="mention-textarea">
            <textarea
                ref={ref}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                onClick={onClick}
            />
            {picker && filtered.length > 0 && (
                <div className="mention-picker" onMouseDown={(e) => e.preventDefault()}>
                    {filtered.slice(0, 8).map((c, i) => (
                        <button
                            type="button"
                            key={c.kind + c.display}
                            className={`mention-pick${i === activeIdx ? ' is-active' : ''}`}
                            onMouseEnter={() => setActiveIdx(i)}
                            onClick={() => insertMention(c.display)}
                        >
                            <span className="mention-pick-symbol">@</span>
                            <span className="mention-pick-name">{c.display}</span>
                            <span className="mention-pick-kind">{c.kind}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
