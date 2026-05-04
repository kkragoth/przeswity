import { PaneState, paneClass, type PaneSide, usePaneStore } from '@/containers/editor/session/paneStore';

interface EditorSkeletonProps {
    bookTitle?: string;
}

const TEXT_LINE_WIDTHS = ['92%', '78%', '88%', '64%', '95%', '82%', '70%', '90%', '55%'];

function PaneSkeleton({ side, state, lineWidths }: { side: PaneSide; state: PaneState; lineWidths: string[] }) {
    if (state === PaneState.Hidden) return null;
    return (
        <aside className={`${side}-pane editor-skeleton-pane`} aria-hidden="true">
            <div className="pane-header editor-skeleton-pane-header">
                <span className="editor-skeleton-bar editor-skeleton-bar-pane-title" />
            </div>
            <div className="pane-body editor-skeleton-pane-body">
                {lineWidths.map((w, i) => (
                    <span key={i} className="editor-skeleton-bar" style={{ width: w }} />
                ))}
            </div>
        </aside>
    );
}

export function EditorSkeleton({ bookTitle }: EditorSkeletonProps) {
    const leftState = usePaneStore((s) => s.left);
    const rightState = usePaneStore((s) => s.right);
    const hostClass = ['editor-host', 'editor-skeleton', paneClass('left', leftState), paneClass('right', rightState)].join(' ');

    return (
        <div className={hostClass} aria-busy="true" aria-live="polite">
            <header className="topbar editor-skeleton-topbar">
                <span className="editor-skeleton-logo" />
                <nav className="topbar-breadcrumb" aria-hidden="true">
                    <span className="editor-skeleton-bar editor-skeleton-bar-crumb" />
                    <span className="editor-skeleton-sep">/</span>
                    {bookTitle
                        ? <span className="editor-skeleton-title-text">{bookTitle}</span>
                        : <span className="editor-skeleton-bar editor-skeleton-bar-title" />}
                </nav>
                <div className="topbar-spacer" />
                <span className="editor-skeleton-avatar" />
            </header>
            <main className="main-grid">
                <PaneSkeleton side="left" state={leftState} lineWidths={['60%', '85%', '70%', '50%', '78%']} />
                <section className="center-pane editor-skeleton-center">
                    <div className="editor-skeleton-toolbar" aria-hidden="true">
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool editor-skeleton-tool-wide" />
                        <span className="editor-skeleton-tool-sep" />
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool-sep" />
                        <span className="editor-skeleton-tool" />
                        <span className="editor-skeleton-tool" />
                    </div>
                    <div className="editor-skeleton-canvas" aria-hidden="true">
                        <div className="editor-skeleton-page">
                            <span className="editor-skeleton-bar editor-skeleton-heading" />
                            {TEXT_LINE_WIDTHS.map((w, i) => (
                                <span key={i} className="editor-skeleton-bar editor-skeleton-line" style={{ width: w }} />
                            ))}
                            <span className="editor-skeleton-bar editor-skeleton-heading editor-skeleton-heading-sub" />
                            {TEXT_LINE_WIDTHS.slice(0, 5).map((w, i) => (
                                <span key={`b-${i}`} className="editor-skeleton-bar editor-skeleton-line" style={{ width: w }} />
                            ))}
                        </div>
                    </div>
                    <div className="editor-skeleton-status" aria-hidden="true">
                        <span className="editor-skeleton-bar editor-skeleton-status-item" />
                        <span className="editor-skeleton-bar editor-skeleton-status-item" />
                        <span className="editor-skeleton-status-spacer" />
                        <span className="editor-skeleton-bar editor-skeleton-status-item" />
                    </div>
                </section>
                <PaneSkeleton side="right" state={rightState} lineWidths={['90%', '65%', '80%']} />
            </main>
        </div>
    );
}
