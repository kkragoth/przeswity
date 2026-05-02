import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

interface SpecialCharsMenuProps {
  editor: Editor | null
}

interface CharGroup {
  title: string
  chars: { char: string; label: string }[]
}

const GROUPS: CharGroup[] = [
    {
        title: 'Punctuation',
        chars: [
            { char: '—', label: 'em dash' },
            { char: '–', label: 'en dash' },
            { char: '…', label: 'ellipsis' },
            { char: '·', label: 'middle dot' },
            { char: '•', label: 'bullet' },
            { char: '§', label: 'section' },
            { char: '¶', label: 'pilcrow' },
            { char: '†', label: 'dagger' },
            { char: '‡', label: 'double dagger' },
        ],
    },
    {
        title: 'Quotes',
        chars: [
            { char: '“', label: 'left double' },
            { char: '”', label: 'right double' },
            { char: '‘', label: 'left single' },
            { char: '’', label: 'right single' },
            { char: '«', label: 'guillemet «' },
            { char: '»', label: 'guillemet »' },
            { char: '„', label: 'low double (PL)' },
        ],
    },
    {
        title: 'Math & symbols',
        chars: [
            { char: '×', label: 'times' },
            { char: '÷', label: 'divide' },
            { char: '±', label: 'plus-minus' },
            { char: '≈', label: 'approx' },
            { char: '≠', label: 'not equal' },
            { char: '°', label: 'degree' },
            { char: '½', label: 'half' },
            { char: '¼', label: 'quarter' },
            { char: '¾', label: 'three quarters' },
        ],
    },
    {
        title: 'Arrows',
        chars: [
            { char: '→', label: 'right' },
            { char: '←', label: 'left' },
            { char: '↑', label: 'up' },
            { char: '↓', label: 'down' },
            { char: '⇒', label: 'right double' },
            { char: '⇐', label: 'left double' },
            { char: '⇔', label: 'left-right double' },
        ],
    },
    {
        title: 'Currency',
        chars: [
            { char: '€', label: 'euro' },
            { char: '£', label: 'pound' },
            { char: '$', label: 'dollar' },
            { char: '¥', label: 'yen' },
            { char: 'zł', label: 'złoty' },
        ],
    },
    {
        title: 'Polish',
        chars: [
            { char: 'ą', label: 'a ogonek' },
            { char: 'ć', label: 'c acute' },
            { char: 'ę', label: 'e ogonek' },
            { char: 'ł', label: 'l stroke' },
            { char: 'ń', label: 'n acute' },
            { char: 'ó', label: 'o acute' },
            { char: 'ś', label: 's acute' },
            { char: 'ź', label: 'z acute' },
            { char: 'ż', label: 'z dot' },
        ],
    },
];

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
                    {GROUPS.map((g) => (
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
