/**
 * Shared primitives for the editor toolbar: tooltip wrapper, icon button,
 * segmented mode toggle, and highlight colour popover.
 */
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Lock, Highlighter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HIGHLIGHT_PALETTE } from '@/editor/tiptap/extensions/Highlight';

// ── Tooltip ──────────────────────────────────────────────────────────────────

interface TipProps {
    label: string
    shortcut?: string
    children: React.ReactElement
}

export function Tip({ label, shortcut, children }: TipProps) {
    return (
        <TooltipPrimitive.Root delayDuration={400}>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content className="tb-tooltip" sideOffset={6}>
                    {label}
                    {shortcut && <> <kbd className="tb-tooltip-kbd">{shortcut}</kbd></>}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}

// ── Icon button ───────────────────────────────────────────────────────────────

interface TbBtnProps {
    active?: boolean
    disabled?: boolean
    onClick: () => void
    label: string
    shortcut?: string
    children: React.ReactNode
}

export function TbBtn({ active, disabled, onClick, label, shortcut, children }: TbBtnProps) {
    return (
        <Tip label={label} shortcut={shortcut}>
            <button
                type="button"
                className={`tb-btn${active ? ' is-active' : ''}`}
                onClick={onClick}
                disabled={disabled}
                aria-label={label}
                aria-pressed={active}
            >
                {children}
            </button>
        </Tip>
    );
}

// ── Mode segmented control ────────────────────────────────────────────────────

interface ModeToggleProps {
    suggestingMode: boolean
    suggestingForced: boolean
    onSuggestingModeChange: (mode: boolean) => void
}

export function ModeToggle({ suggestingMode, suggestingForced, onSuggestingModeChange }: ModeToggleProps) {
    const { t } = useTranslation('editor');

    const control = (
        <div className={`mode-toggle${suggestingForced ? ' mode-toggle--locked' : ''}`}>
            <button
                type="button"
                className={`mode-seg${!suggestingMode ? ' is-active' : ''}`}
                disabled={suggestingForced}
                onClick={() => onSuggestingModeChange(false)}
                aria-pressed={!suggestingMode}
            >
                {t('toolbar.modeEdit')}
            </button>
            <button
                type="button"
                className={`mode-seg mode-seg--suggest${suggestingMode ? ' is-active' : ''}`}
                disabled={suggestingForced}
                onClick={() => onSuggestingModeChange(true)}
                aria-pressed={suggestingMode}
            >
                {t('toolbar.modeSuggest')}
            </button>
            {suggestingForced && <Lock size={12} className="mode-lock-icon" aria-hidden />}
        </div>
    );

    if (suggestingForced) {
        return <Tip label={t('toolbar.modeForcedTooltip')}>{control}</Tip>;
    }

    return control;
}

// ── Highlight colour popover ──────────────────────────────────────────────────

interface HighlightBtnProps {
    editor: import('@tiptap/react').Editor
    label: string
}

export function HighlightBtn({ editor, label }: HighlightBtnProps) {
    const { t } = useTranslation('editor');

    return (
        <Tip label={label}>
            <div className="tb-highlight-wrap">
                <button
                    type="button"
                    className={`tb-btn${editor.isActive('highlight') ? ' is-active' : ''}`}
                    aria-label={label}
                    onClick={() => editor.chain().focus().toggleHighlight().run()}
                >
                    <Highlighter size={14} />
                </button>
                <div className="tb-highlight-pop">
                    {HIGHLIGHT_PALETTE.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className="tb-color-swatch"
                            style={{ background: c }}
                            title={c}
                            onClick={() => editor.chain().focus().setHighlight({ color: c }).run()}
                        />
                    ))}
                    <button
                        type="button"
                        className="tb-color-clear"
                        title={t('toolbar.removeHighlight')}
                        onClick={() => editor.chain().focus().unsetHighlight().run()}
                    >
                        ⊘
                    </button>
                </div>
            </div>
        </Tip>
    );
}
