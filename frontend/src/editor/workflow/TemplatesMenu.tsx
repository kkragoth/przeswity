import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { TEMPLATES } from './templates';

interface TemplatesMenuProps {
  editor: Editor | null
  onToast?: (msg: string, kind?: 'info' | 'success' | 'error') => void
}

export function TemplatesMenu({ editor, onToast }: TemplatesMenuProps) {
    const [open, setOpen] = useState(false);

    if (!editor) return null;

    const apply = (id: string) => {
        const t = TEMPLATES.find((x) => x.id === id);
        if (!t) return;
        if (
            !window.confirm(
                `Apply template "${t.name}"?\n\nThis replaces the current document. Save a snapshot first if you want to keep the current content.`,
            )
        )
            return;
        editor.commands.setContent(t.content as never, { emitUpdate: true });
        onToast?.(`Loaded template: ${t.name}`, 'success');
        setOpen(false);
    };

    return (
        <div className="export-menu">
            <button
                type="button"
                className="tb-btn"
                title="Document templates"
                onClick={() => setOpen((v) => !v)}
            >
        Templates ▾
            </button>
            {open && (
                <div className="templates-dropdown" onMouseLeave={() => setOpen(false)}>
                    {TEMPLATES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className="template-item"
                            onClick={() => apply(t.id)}
                        >
                            <div className="template-name">{t.name}</div>
                            <div className="template-description">{t.description}</div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
