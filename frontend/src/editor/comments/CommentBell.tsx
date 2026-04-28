import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { useThreads } from './useThreads';

interface CommentBellProps {
  doc: Y.Doc
  room: string
  userId: string
  onClick?: () => void
}

const KEY_PREFIX = 'editor-poc.lastRead.';

function loadLastRead(room: string): number {
    const raw = localStorage.getItem(KEY_PREFIX + room);
    return raw ? parseInt(raw, 10) : Date.now();
}

function saveLastRead(room: string, ts: number): void {
    localStorage.setItem(KEY_PREFIX + room, String(ts));
}

export function CommentBell({ doc, room, userId, onClick }: CommentBellProps) {
    const threads = useThreads(doc);
    const [lastRead, setLastRead] = useState<number>(() => loadLastRead(room));

    useEffect(() => {
        setLastRead(loadLastRead(room));
    }, [room]);

    const unread = useMemo(() => {
        let n = 0;
        for (const t of threads) {
            if (t.authorId !== userId && t.createdAt > lastRead && t.body) n++;
            for (const r of t.replies) {
                if (r.authorId !== userId && r.createdAt > lastRead) n++;
            }
        }
        return n;
    }, [threads, lastRead, userId]);

    const handleClick = () => {
        const now = Date.now();
        setLastRead(now);
        saveLastRead(room, now);
        onClick?.();
    };

    return (
        <button
            type="button"
            className={`bell${unread > 0 ? ' has-unread' : ''}`}
            onClick={handleClick}
            title={unread > 0 ? `${unread} unread` : 'No unread comments'}
        >
            <span className="bell-icon">🔔</span>
            {unread > 0 && (
                <span className="bell-badge">{unread > 99 ? '99+' : unread}</span>
            )}
        </button>
    );
}
