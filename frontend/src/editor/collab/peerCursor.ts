import type { DecorationAttrs } from 'prosemirror-view';

const LABEL_VISIBLE_MS = 2000;
const WORD_JOINER = '⁠';

interface PeerUser {
    name?: string
    color?: string
    userId?: string
    lastActiveAt?: number
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0] ?? '').join('').toUpperCase() || '?';
}

export function peerCursorBuilder(user: PeerUser, clientId: number): HTMLElement {
    const color = user.color ?? '#888';
    const name = user.name ?? '?';
    const userId = user.userId ?? String(clientId);
    const isActive = Date.now() - (user.lastActiveAt ?? 0) < LABEL_VISIBLE_MS;

    const wrap = document.createElement('span');
    wrap.className = 'peer-cursor';
    wrap.dataset.peer = userId;
    wrap.dataset.clientId = String(clientId);
    wrap.style.setProperty('--peer-color', color);

    // Word joiners give the inline span a layout box so its left border
    // (the caret) renders against the surrounding text's line box.
    wrap.appendChild(document.createTextNode(WORD_JOINER));

    const label = document.createElement('span');
    label.className = 'peer-cursor__label';
    if (isActive) label.dataset.recent = 'true';

    const dot = document.createElement('span');
    dot.className = 'peer-cursor__dot';
    dot.textContent = initials(name);
    label.appendChild(dot);

    const text = document.createElement('span');
    text.className = 'peer-cursor__name';
    text.textContent = name;
    label.appendChild(text);

    wrap.appendChild(label);
    wrap.appendChild(document.createTextNode(WORD_JOINER));
    return wrap;
}

export function peerSelectionBuilder(user: PeerUser): DecorationAttrs {
    const color = user.color ?? '#888';
    return {
        class: 'peer-selection',
        style: `background-color: ${hexWithAlpha(color, 0.18)};`,
    };
}

function hexWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
        const hex = color.length === 4
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
            : color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
}
