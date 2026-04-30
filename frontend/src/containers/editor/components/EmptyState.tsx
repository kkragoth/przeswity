import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon: ReactNode
    title: string
    action?: {
        label: string
        onClick: () => void
    }
}

export function EmptyState({ icon, title, action }: EmptyStateProps) {
    return (
        <div className="pane-empty">
            <div className="pane-empty-icon" aria-hidden="true">
                {icon}
            </div>
            <p className="pane-empty-title">{title}</p>
            {action && (
                <button
                    type="button"
                    className="pane-empty-action"
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
