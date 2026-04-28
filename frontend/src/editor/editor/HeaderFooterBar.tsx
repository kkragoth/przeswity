import { useState, useEffect } from 'react';
import '@/editor/editor/header-footer-bar.css';

interface HeaderFooterBarProps {
    kind: 'header' | 'footer';
    left: string;
    right: string;
    onApply: (left: string, right: string) => void;
    onDismiss: () => void;
}

export function HeaderFooterBar({ kind, left, right, onApply, onDismiss }: HeaderFooterBarProps) {
    const [leftVal, setLeftVal] = useState(left);
    const [rightVal, setRightVal] = useState(right);

    useEffect(() => {
        setLeftVal(left);
        setRightVal(right);
    }, [left, right, kind]);

    const apply = () => onApply(leftVal, rightVal);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') apply();
        if (e.key === 'Escape') onDismiss();
    };

    return (
        <div className="hf-bar">
            <span className="hf-bar__label">{kind === 'header' ? 'Header' : 'Footer'}</span>
            <div className="hf-bar__inputs">
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">Left</span>
                    <input
                        className="hf-bar__input"
                        value={leftVal}
                        onChange={(e) => setLeftVal(e.target.value)}
                        onBlur={apply}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Chapter title"
                    />
                </div>
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">Right</span>
                    <input
                        className="hf-bar__input"
                        value={rightVal}
                        onChange={(e) => setRightVal(e.target.value)}
                        onBlur={apply}
                        onKeyDown={handleKeyDown}
                        placeholder="{page} of {total}"
                    />
                </div>
            </div>
            <span className="hf-bar__hint">tokens: {'{page}'} {'{total}'}</span>
            <button type="button" className="hf-bar__close" onClick={onDismiss} aria-label="Close">✕</button>
        </div>
    );
}
