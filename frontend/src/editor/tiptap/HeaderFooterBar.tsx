import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '@/editor/tiptap/header-footer-bar.css';

export enum HeaderFooterKind {
    None = 'none',
    Header = 'header',
    Footer = 'footer',
}

interface HeaderFooterBarProps {
    kind: HeaderFooterKind;
    left: string;
    right: string;
    onApply: (left: string, right: string) => void;
    onDismiss: () => void;
}

export function HeaderFooterBar({ kind, left, right, onApply, onDismiss }: HeaderFooterBarProps) {
    const { t } = useTranslation('editor');
    const [leftVal, setLeftVal] = useState(left);
    const [rightVal, setRightVal] = useState(right);

    useEffect(() => {
        setLeftVal(left);
        setRightVal(right);
    }, [left, right, kind]);

    const pendingApplyRef = useRef(false);

    // Guard against blur+Enter and blur+click double-fire within the same event cycle
    const handleApply = () => {
        if (pendingApplyRef.current) return;
        pendingApplyRef.current = true;
        onApply(leftVal, rightVal);
        setTimeout(() => { pendingApplyRef.current = false; }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleApply();
        if (e.key === 'Escape') onDismiss();
    };

    return (
        <div className="hf-bar">
            <span className="hf-bar__label">
                {kind === HeaderFooterKind.Header
                    ? t('headerFooterBar.labelHeader')
                    : t('headerFooterBar.labelFooter')}
            </span>
            <div className="hf-bar__inputs">
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">{t('headerFooterBar.fieldLeft')}</span>
                    <input
                        className="hf-bar__input"
                        value={leftVal}
                        onChange={(e) => setLeftVal(e.target.value)}
                        onBlur={handleApply}
                        onKeyDown={handleKeyDown}
                        placeholder={t('headerFooterBar.placeholderLeft')}
                    />
                </div>
                <div className="hf-bar__field">
                    <span className="hf-bar__field-label">{t('headerFooterBar.fieldRight')}</span>
                    <input
                        className="hf-bar__input"
                        value={rightVal}
                        onChange={(e) => setRightVal(e.target.value)}
                        onBlur={handleApply}
                        onKeyDown={handleKeyDown}
                        placeholder={t('headerFooterBar.placeholderRight')}
                    />
                </div>
            </div>
            <span className="hf-bar__hint">{t('headerFooterBar.tokensHint')}</span>
            <button
                type="button"
                className="hf-bar__close"
                onClick={onDismiss}
                aria-label={t('headerFooterBar.close')}
            >
                ✕
            </button>
        </div>
    );
}
