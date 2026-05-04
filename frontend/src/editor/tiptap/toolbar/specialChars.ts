export interface SpecialChar {
    char: string
    label: string
}

export interface SpecialCharGroup {
    title: string
    chars: SpecialChar[]
}

export const SPECIAL_CHAR_GROUPS: SpecialCharGroup[] = [
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
