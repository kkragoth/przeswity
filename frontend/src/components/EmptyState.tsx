import { type ReactNode } from 'react';

export function EmptyState({ title, body, cta }: { title: string; body?: string; cta?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-medium">{title}</h3>
            {body && <p className="mt-2 max-w-md text-sm text-stone-600">{body}</p>}
            {cta && <div className="mt-4">{cta}</div>}
        </div>
    );
}
