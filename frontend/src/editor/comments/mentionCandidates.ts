import { ALL_ROLES } from '@/editor/identity/types';
import { MentionKind, type MentionCandidate } from '@/editor/comments/types';

export function buildCandidates(peers: { name: string }[], selfName: string): MentionCandidate[] {
    const namesSeen = new Set<string>();
    const out: MentionCandidate[] = [];
    for (const p of peers) {
        if (p.name === selfName) continue;
        if (namesSeen.has(p.name)) continue;
        namesSeen.add(p.name);
        out.push({ display: p.name, kind: MentionKind.User });
    }
    for (const r of ALL_ROLES) out.push({ display: r, kind: MentionKind.Role });
    return out;
}
