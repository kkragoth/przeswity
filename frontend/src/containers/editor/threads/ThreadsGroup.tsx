import { useState, type ReactNode } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';

interface ThreadsGroupProps {
    title: string;
    count: number;
    onLocate?: () => void;
    onHeaderInteract?: () => void;
    children: ReactNode;
}

export function ThreadsGroup({ title, count, onLocate, onHeaderInteract, children }: ThreadsGroupProps) {
    const [open, setOpen] = useState(true);
    const toggle = () => {
        setOpen((v) => !v);
        onHeaderInteract?.();
    };
    return (
        <div className="threads-group">
            <div
                className="threads-group-header"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
            >
                <span className={`threads-group-toggle${open ? ' is-open' : ''}`} aria-hidden>
                    <ChevronDown size={12} />
                </span>
                <span className="threads-group-title" title={title}>
                    {title}
                </span>
                <span className="threads-group-count">{count}</span>
                {onLocate && (
                    <button
                        type="button"
                        className="threads-group-locate"
                        onClick={(e) => {
                            e.stopPropagation();
                            onLocate();
                        }}
                        title={title}
                        aria-label={title}
                    >
                        <MapPin size={11} />
                    </button>
                )}
            </div>
            {open && <div className="threads-group-body">{children}</div>}
        </div>
    );
}
