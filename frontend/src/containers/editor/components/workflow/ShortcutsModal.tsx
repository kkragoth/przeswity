import { useTranslation } from 'react-i18next';

interface ShortcutsModalProps {
  onClose: () => void
}

interface Group {
  titleKey: string
  rows: { keys: string; labelKey: string }[]
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';
const A = isMac ? '⌥' : 'Alt';

const GROUPS: Group[] = [
    {
        titleKey: 'shortcuts.groups.document',
        rows: [
            { keys: `${M}+Z`, labelKey: 'shortcuts.undo' },
            { keys: `${M}+Shift+Z`, labelKey: 'shortcuts.redo' },
            { keys: `${M}+F`, labelKey: 'shortcuts.findReplace' },
            { keys: `${M}+/`, labelKey: 'shortcuts.shortcutSheet' },
            { keys: `${M}+S`, labelKey: 'shortcuts.saveSnapshot' },
        ],
    },
    {
        titleKey: 'shortcuts.groups.format',
        rows: [
            { keys: `${M}+B`, labelKey: 'shortcuts.bold' },
            { keys: `${M}+I`, labelKey: 'shortcuts.italic' },
            { keys: `${M}+U`, labelKey: 'shortcuts.underline' },
            { keys: `${M}+K`, labelKey: 'shortcuts.insertLink' },
            { keys: `${M}+${A}+1…3`, labelKey: 'shortcuts.headings' },
            { keys: `${M}+${A}+0`, labelKey: 'shortcuts.body' },
            { keys: `${M}+Shift+8`, labelKey: 'shortcuts.bulletList' },
            { keys: `${M}+Shift+7`, labelKey: 'shortcuts.numberedList' },
            { keys: `${M}+Shift+B`, labelKey: 'shortcuts.quote' },
        ],
    },
    {
        titleKey: 'shortcuts.groups.comments',
        rows: [
            { keys: `${M}+${A}+M`, labelKey: 'shortcuts.addComment' },
            { keys: 'Right-click', labelKey: 'shortcuts.contextMenu' },
            { keys: 'Backspace / Delete', labelKey: 'shortcuts.suggestingDelete' },
        ],
    },
    {
        titleKey: 'shortcuts.groups.navigation',
        rows: [
            { keys: 'Click thread', labelKey: 'shortcuts.scrollToAnchor' },
            { keys: 'Click outline', labelKey: 'shortcuts.jumpToHeading' },
            { keys: 'Esc', labelKey: 'shortcuts.closeEsc' },
        ],
    },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
    const { t } = useTranslation('editor');

    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal modal-narrow" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <div className="modal-title">{t('shortcuts.modalTitle')}</div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose}>
                            {t('shortcuts.close')}
                        </button>
                    </div>
                </header>
                <div className="modal-body">
                    <div className="shortcut-grid">
                        {GROUPS.map((g) => (
                            <div key={g.titleKey} className="shortcut-group">
                                <div className="shortcut-group-title">{t(g.titleKey as never)}</div>
                                {g.rows.map((r) => (
                                    <div key={r.keys + r.labelKey} className="shortcut-row">
                                        <span className="shortcut-keys">
                                            {r.keys.split('+').map((k, i, arr) => (
                                                <span key={i}>
                                                    <kbd>{k}</kbd>
                                                    {i < arr.length - 1 && <span className="shortcut-plus">+</span>}
                                                </span>
                                            ))}
                                        </span>
                                        <span className="shortcut-label">{t(r.labelKey as never)}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
