import { useState } from 'react';
import type { BulkCreateAssignmentsBody } from '@/api/generated/types.gen';
import { ROLE_KEYS } from '@/components/badges/RoleBadge';

type Role = (typeof ROLE_KEYS)[number];
type Draft = BulkCreateAssignmentsBody['assignments'][number];

function dedupe(drafts: ReadonlyArray<Draft>): ReadonlyArray<Draft> {
    const seen = new Set<string>();
    return drafts.filter((draft) => {
        const key = `${draft.userId}:${draft.role}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function usePeoplePickerState() {
    const [open, setOpen] = useState(false);
    const [drafts, setDrafts] = useState<ReadonlyArray<Draft>>([]);
    const [filter, setFilter] = useState('');
    const [pickedUserId, setPickedUserId] = useState('');
    const [pickedRole, setPickedRole] = useState<Role>('editor');

    const addDraft = () => {
        if (!pickedUserId) return;
        setDrafts((prev) => dedupe([...prev, { userId: pickedUserId, role: pickedRole }]));
    };

    const removeDraft = (userId: string, role: Role) =>
        setDrafts((prev) => prev.filter((draft) => !(draft.userId === userId && draft.role === role)));

    const closeDialog = () => {
        setOpen(false);
        setDrafts([]);
    };

    return {
        open,
        setOpen,
        drafts,
        setDrafts,
        filter,
        setFilter,
        pickedUserId,
        setPickedUserId,
        pickedRole,
        setPickedRole,
        addDraft,
        removeDraft,
        closeDialog,
    };
}
