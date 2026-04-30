import type { ReactNode } from 'react';

interface PageLayoutProps {
    title: ReactNode;
    subtitle?: ReactNode;
    actions?: ReactNode;
    filters?: ReactNode;
    children: ReactNode;
}

export function PageLayout({ title, subtitle, actions, filters, children }: PageLayoutProps) {
    return (
        <div className="mx-auto max-w-7xl px-4 py-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
                </div>
                {actions}
            </div>
            {filters ? <div className="mt-6">{filters}</div> : null}
            <div>{children}</div>
        </div>
    );
}
