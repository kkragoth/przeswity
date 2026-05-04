import { beforeEach, describe, expect, it } from 'vitest';
import { PaneState, usePaneStore } from '@/containers/editor/stores/paneStore';

beforeEach(() => {
    usePaneStore.setState({ left: PaneState.Expanded, right: PaneState.Expanded });
});

describe('paneStore.cycle', () => {
    it('cycles Expanded to Hidden', () => {
        usePaneStore.getState().cycle('left');
        expect(usePaneStore.getState().left).toBe(PaneState.Hidden);
    });

    it('cycles Hidden to Expanded', () => {
        usePaneStore.setState({ left: PaneState.Hidden });
        usePaneStore.getState().cycle('left');
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
    });

    it('cycles Rail to Expanded', () => {
        usePaneStore.setState({ left: PaneState.Rail });
        usePaneStore.getState().cycle('left');
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
    });
});

describe('paneStore.hide', () => {
    it('forces a side to Hidden', () => {
        usePaneStore.getState().hide('right');
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });
});

describe('paneStore.toggle (narrow)', () => {
    it('collapses Expanded to Hidden', () => {
        usePaneStore.getState().toggle('left', true);
        expect(usePaneStore.getState().left).toBe(PaneState.Hidden);
    });

    it('from Hidden expands and hides the opposite', () => {
        usePaneStore.setState({ left: PaneState.Hidden, right: PaneState.Expanded });
        usePaneStore.getState().toggle('left', true);
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });

    it('from Rail expands and hides the opposite', () => {
        usePaneStore.setState({ left: PaneState.Rail, right: PaneState.Expanded });
        usePaneStore.getState().toggle('left', true);
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });
});

describe('paneStore.toggle (wide)', () => {
    it('cycles Expanded to Hidden without touching opposite', () => {
        usePaneStore.getState().toggle('left', false);
        expect(usePaneStore.getState().left).toBe(PaneState.Hidden);
        expect(usePaneStore.getState().right).toBe(PaneState.Expanded);
    });

    it('cycles Hidden to Expanded without touching opposite', () => {
        usePaneStore.setState({ left: PaneState.Hidden, right: PaneState.Hidden });
        usePaneStore.getState().toggle('left', false);
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });
});

describe('paneStore.showSide', () => {
    it('narrow: expands side and hides opposite', () => {
        usePaneStore.setState({ left: PaneState.Hidden, right: PaneState.Expanded });
        usePaneStore.getState().showSide('left', true);
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });

    it('wide: expands side, leaves opposite untouched', () => {
        usePaneStore.setState({ left: PaneState.Hidden, right: PaneState.Expanded });
        usePaneStore.getState().showSide('left', false);
        expect(usePaneStore.getState().left).toBe(PaneState.Expanded);
        expect(usePaneStore.getState().right).toBe(PaneState.Expanded);
    });
});

describe('paneStore.dismissBoth', () => {
    it('hides both sides', () => {
        usePaneStore.getState().dismissBoth();
        expect(usePaneStore.getState().left).toBe(PaneState.Hidden);
        expect(usePaneStore.getState().right).toBe(PaneState.Hidden);
    });
});
