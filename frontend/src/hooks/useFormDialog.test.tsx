// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useFormDialog } from '@/hooks/useFormDialog';

describe('useFormDialog', () => {
    it('opens with overrides and resets on close', () => {
        (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
        const host = document.createElement('div');
        const root = createRoot(host);
        let state: ReturnType<typeof useFormDialog<{ name: string; role: string }>> | undefined;

        function Probe() {
            state = useFormDialog({ name: '', role: 'editor' });
            return null;
        }

        act(() => {
            root.render(<Probe />);
        });
        act(() => {
            state!.openWith({ name: 'Anna' });
        });
        expect(state!.open).toBe(true);
        expect(state!.values).toEqual({ name: 'Anna', role: 'editor' });

        act(() => {
            state!.close();
        });
        expect(state!.open).toBe(false);
        expect(state!.values).toEqual({ name: '', role: 'editor' });
    });
});
