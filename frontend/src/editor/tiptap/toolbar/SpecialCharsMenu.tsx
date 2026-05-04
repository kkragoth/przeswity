import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { SPECIAL_CHAR_GROUPS } from './specialChars';

interface SpecialCharsMenuProps {
  editor: Editor | null
}

export function SpecialCharsMenu({ editor }: SpecialCharsMenuProps) {
    const { t } = useTranslation('editor');
    const [open, setOpen] = useState(false);

    if (!editor) return null;

    const insert = (c: string) => {
        editor.chain().focus().insertContent(c).run();
    };

    return (
        <div className="export-menu">
            <button
                type="button"
                className="tb-btn"
                title={t('specialChars.insertTitle')}
                onClick={() => setOpen((v) => !v)}
            >
        Ω
            </button>
            {open && (
                <div className="special-chars-dropdown" onMouseLeave={() => setOpen(false)}>
                    {SPECIAL_CHAR_GROUPS.map((g) => (
                        <div key={g.title} className="special-chars-group">
                            <div className="special-chars-title">{g.title}</div>
                            <div className="special-chars-grid">
                                {g.chars.map((c) => (
                                    <button
                                        key={g.title + c.char}
                                        type="button"
                                        className="special-char"
                                        title={c.label}
                                        onClick={() => insert(c.char)}
                                    >
                                        {c.char}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
