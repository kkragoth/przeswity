interface AvatarProps {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  ring?: boolean
  badge?: string | number
  title?: string
  onClick?: () => void
}

const PALETTE = [
    '#e11d48',
    '#7c3aed',
    '#0891b2',
    '#16a34a',
    '#ea580c',
    '#9333ea',
    '#0284c7',
    '#0d9488',
    '#be123c',
    '#4338ca',
];

export function colorFromName(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = (h << 5) - h + name.charCodeAt(i);
        h |= 0;
    }
    return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, color, size = 'md', ring, badge, title, onClick }: AvatarProps) {
    const bg = color ?? colorFromName(name);
    return (
        <span
            className={`avatar avatar-${size}${ring ? ' avatar-ring' : ''}${onClick ? ' is-clickable' : ''}`}
            style={{ backgroundColor: bg }}
            title={title ?? name}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
        >
            <span className="avatar-initials">{initials(name)}</span>
            {badge !== undefined && badge !== 0 && <span className="avatar-badge">{badge}</span>}
        </span>
    );
}
