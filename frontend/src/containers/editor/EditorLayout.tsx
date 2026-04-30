import type { ReactNode } from 'react';
import { PaneState } from '@/containers/editor/hooks/usePaneState';

function paneClass(side: 'left' | 'right', state: PaneState): string {
    if (state === PaneState.Expanded) return `pane-${side}-open`;
    return `pane-${side}-${state}`;
}

interface EditorLayoutProps {
    topBar: ReactNode;
    leftPane: ReactNode;
    content: ReactNode;
    rightPane: ReactNode;
    statusBar: ReactNode;
    leftHandle?: ReactNode;
    rightHandle?: ReactNode;
    overlays?: ReactNode;
    paneState: { left: PaneState; right: PaneState };
}

export function EditorLayout(props: EditorLayoutProps) {
    const hostClassName = ['editor-host', paneClass('left', props.paneState.left), paneClass('right', props.paneState.right)]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={hostClassName}>
            {props.topBar}
            <main className="main-grid">
                {props.leftPane}
                {props.leftHandle}
                <section className="center-pane">
                    {props.content}
                    {props.statusBar}
                </section>
                {props.rightPane}
                {props.rightHandle}
            </main>
            {props.overlays}
        </div>
    );
}
