// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { useFormDialog } from '@/hooks/useFormDialog';

type DialogOpts = Parameters<typeof useFormDialog>[1];

function makeDialogHarness(opts?: DialogOpts) {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement('div');
    const root = createRoot(host);
    let state: ReturnType<typeof useFormDialog<{ name: string }>> | undefined;

    function Probe() {
        state = useFormDialog({ name: '' }, opts);
        return null;
    }

    act(() => { root.render(<Probe />); });

    return {
        get dialog() { return state!; },
        unmount: () => act(() => { root.unmount(); }),
    };
}

describe('useFormDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

    it('toastSuccess with default opts calls sonnerToast.success with default key', () => {
        const { dialog, unmount } = makeDialogHarness();
        act(() => { dialog.toastSuccess(); });
        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('messages.success');
        unmount();
    });

    it('toastError with default opts calls sonnerToast.error with default key', () => {
        const { dialog, unmount } = makeDialogHarness();
        act(() => { dialog.toastError(); });
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('messages.error');
        unmount();
    });

    it('successKey: false suppresses toastSuccess', () => {
        const { dialog, unmount } = makeDialogHarness({ successKey: false });
        act(() => { dialog.toastSuccess(); });
        expect(toast.success).not.toHaveBeenCalled();
        unmount();
    });

    it('successKey: custom.key uses the custom key', () => {
        const { dialog, unmount } = makeDialogHarness({ successKey: 'custom.key' });
        act(() => { dialog.toastSuccess(); });
        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('custom.key');
        unmount();
    });

    it('errorKey: false suppresses toastError', () => {
        const { dialog, unmount } = makeDialogHarness({ errorKey: false });
        act(() => { dialog.toastError(); });
        expect(toast.error).not.toHaveBeenCalled();
        unmount();
    });

    it('errorKey: custom.key uses the custom key', () => {
        const { dialog, unmount } = makeDialogHarness({ errorKey: 'custom.error' });
        act(() => { dialog.toastError(); });
        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith('custom.error');
        unmount();
    });
});
