interface ShortcutsModalProps {
  onClose: () => void
}

interface Group {
  title: string
  rows: { keys: string; label: string }[]
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const M = isMac ? '⌘' : 'Ctrl';
const A = isMac ? '⌥' : 'Alt';

const GROUPS: Group[] = [
    {
        title: 'Document',
        rows: [
            { keys: `${M}+Z`, label: 'Undo' },
            { keys: `${M}+Shift+Z`, label: 'Redo' },
            { keys: `${M}+F`, label: 'Find & replace' },
            { keys: `${M}+/`, label: 'This shortcut sheet' },
            { keys: `${M}+S`, label: 'Save snapshot' },
        ],
    },
    {
        title: 'Format',
        rows: [
            { keys: `${M}+B`, label: 'Bold' },
            { keys: `${M}+I`, label: 'Italic' },
            { keys: `${M}+U`, label: 'Underline' },
            { keys: `${M}+K`, label: 'Insert link' },
            { keys: `${M}+${A}+1…3`, label: 'Heading 1 / 2 / 3' },
            { keys: `${M}+${A}+0`, label: 'Body' },
            { keys: `${M}+Shift+8`, label: 'Bullet list' },
            { keys: `${M}+Shift+7`, label: 'Numbered list' },
            { keys: `${M}+Shift+B`, label: 'Quote' },
        ],
    },
    {
        title: 'Comments & suggestions',
        rows: [
            { keys: `${M}+${A}+M`, label: 'Add comment to selection' },
            { keys: 'Right-click', label: 'Context menu (cut/copy/format/comment/accept/reject)' },
            { keys: 'Backspace / Delete', label: 'In Suggesting mode: marks instead of deletes' },
        ],
    },
    {
        title: 'Navigation',
        rows: [
            { keys: 'Click thread', label: 'Scroll to anchor + pulse' },
            { keys: 'Click outline', label: 'Jump to heading' },
            { keys: 'Esc', label: 'Close find / menu / modal' },
        ],
    },
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
    return (
        <div className="modal-backdrop" onMouseDown={onClose}>
            <div className="modal modal-narrow" onMouseDown={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div>
                        <div className="modal-title">Keyboard shortcuts</div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" onClick={onClose}>
              Close
                        </button>
                    </div>
                </header>
                <div className="modal-body">
                    <div className="shortcut-grid">
                        {GROUPS.map((g) => (
                            <div key={g.title} className="shortcut-group">
                                <div className="shortcut-group-title">{g.title}</div>
                                {g.rows.map((r) => (
                                    <div key={r.keys + r.label} className="shortcut-row">
                                        <span className="shortcut-keys">
                                            {r.keys.split('+').map((k, i, arr) => (
                                                <span key={i}>
                                                    <kbd>{k}</kbd>
                                                    {i < arr.length - 1 && <span className="shortcut-plus">+</span>}
                                                </span>
                                            ))}
                                        </span>
                                        <span className="shortcut-label">{r.label}</span>
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
