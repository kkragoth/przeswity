export function KpiCard({
    label,
    value,
    icon: Icon,
    tone = 'default',
    onClick,
}: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    tone?: 'default' | 'primary' | 'danger';
    onClick: () => void;
}) {
    const toneClass = tone === 'danger' ? 'text-destructive' : tone === 'primary' ? 'text-primary' : 'text-foreground';
    return (
        <button type="button" onClick={onClick} className="rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/40">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
        </button>
    );
}
