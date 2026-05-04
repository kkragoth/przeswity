import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

interface PageJumperProps {
    current: number;
    total: number;
    onJump: (page: number) => void;
}

export function PageJumper({ current, total, onJump }: PageJumperProps) {
    const { t } = useTranslation('editor');
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<string>(String(current));
    const rootRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!open) {
            setDraft(String(current));
            return;
        }
        inputRef.current?.focus();
        inputRef.current?.select();
        const onPointer = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, current]);

    const submit = () => {
        const n = parseInt(draft, 10);
        if (Number.isFinite(n)) onJump(n);
        setOpen(false);
    };

    return (
        <div className="page-jumper" ref={rootRef}>
            <button
                type="button"
                className="page-jumper-trigger"
                onClick={() => setOpen((v) => !v)}
                title={t('statusbar.jumpPageTitle')}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <FileText size={11} />
                <span>{t('statusbar.pageOf', { current, total })}</span>
            </button>
            {open ? (
                <div className="page-jumper-popover" role="dialog">
                    <label className="page-jumper-label" htmlFor="page-jumper-input">
                        {t('statusbar.jumpPageLabel')}
                    </label>
                    <div className="page-jumper-row">
                        <input
                            id="page-jumper-input"
                            ref={inputRef}
                            className="page-jumper-input"
                            type="number"
                            min={1}
                            max={total}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); submit(); }
                            }}
                        />
                        <span className="page-jumper-of">/ {total}</span>
                        <button type="button" className="page-jumper-go" onClick={submit}>
                            {t('statusbar.jumpPageGo')}
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
