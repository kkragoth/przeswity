import { ALL_ROLES } from '@/editor/identity/types';
import { MentionKind, type MentionCandidate } from '@/editor/comments/types';

interface CandidateInput {
    peers: { name: string }[];
    assignees: { name: string }[];
    selfName: string;
}

export function buildCandidates({ peers, assignees, selfName }: CandidateInput): MentionCandidate[] {
    const namesSeen = new Set<string>();
    const out: MentionCandidate[] = [];
    const pushUser = (name: string) => {
        if (!name || name === selfName || namesSeen.has(name)) return;
        namesSeen.add(name);
        out.push({ display: name, kind: MentionKind.User });
    };
    for (const a of assignees) pushUser(a.name);
    for (const p of peers) pushUser(p.name);
    for (const r of ALL_ROLES) out.push({ display: r, kind: MentionKind.Role });
    return out;
}
