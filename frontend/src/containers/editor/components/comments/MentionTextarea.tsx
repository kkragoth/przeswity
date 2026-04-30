import { useLayoutEffect, useRef, useState } from 'react';
import type { Role } from '@/editor/identity/types';

export interface MentionCandidate {
  display: string
  kind: 'user' | 'role'
}

interface MentionTextareaProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  autoFocus?: boolean
  candidates: MentionCandidate[]
  onClick?: (e: React.MouseEvent<HTMLTextAreaElement>) => void
}

const ROLES: Role[] = [
    'translator',
    'author',
    'editor',
    'proofreader',
    'typesetter',
    'coordinator',
    'admin',
];

export function buildCandidates(
    peers: { name: string }[],
    selfName: string,
): MentionCandidate[] {
    const namesSeen = new Set<string>();
    const out: MentionCandidate[] = [];
    for (const p of peers) {
        if (p.name === selfName) continue;
        if (namesSeen.has(p.name)) continue;
        namesSeen.add(p.name);
        out.push({ display: p.name, kind: 'user' });
    }
    for (const r of ROLES) out.push({ display: r, kind: 'role' });
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
        const isRole = ROLES.includes(m[1] as Role);
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
    const [picker, setPicker] = useState<{ from: number; query: string } | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);

    const filtered = picker
        ? candidates.filter((c) =>
            c.display.toLowerCase().startsWith(picker.query.toLowerCase()),
        )
        : [];

    const detect = (next: string, caret: number) => {
        const before = next.slice(0, caret);
        const m = before.match(/@([\p{L}\p{N}_-]*)$/u);
        if (m) {
            const at = caret - m[0].length;
            // Only trigger if @ is at start or preceded by whitespace
            const prev = at === 0 ? '' : next[at - 1];
            if (at === 0 || /\s/.test(prev)) {
                setPicker({ from: at, query: m[1] });
                setActiveIdx(0);
                return;
            }
        }
        if (picker) setPicker(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        detect(e.target.value, e.target.selectionStart);
    };

    const insertMention = (display: string) => {
        if (!picker || !ref.current) return;
        const caret = ref.current.selectionStart;
        const next = value.slice(0, picker.from) + '@' + display + ' ' + value.slice(caret);
        onChange(next);
        setPicker(null);
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
            setPicker(null);
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
