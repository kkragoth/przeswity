import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface SlashTriggerInfo {
  active: boolean
  query: string
  coords: { left: number; top: number; bottom: number } | null
  range: { from: number; to: number } | null
}

export interface SlashCommandOptions {
  onTrigger: (info: SlashTriggerInfo) => void
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
    name: 'slashCommand',

    addOptions() {
        return { onTrigger: () => {} };
    },

    addProseMirrorPlugins() {
        const opts = this.options;
        return [
            new Plugin({
                key: new PluginKey('slashCommand'),
                view: () => {
                    let last: SlashTriggerInfo = { active: false, query: '', coords: null, range: null };
                    return {
                        update: (view) => {
                            const { selection, doc } = view.state;
                            if (!selection.empty) {
                                if (last.active) {
                                    last = { active: false, query: '', coords: null, range: null };
                                    opts.onTrigger(last);
                                }
                                return;
                            }
                            const $from = selection.$from;
                            if (!$from.parent.isTextblock) return;
                            const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\n');
                            const match = before.match(/(?:^|\s)(\/\S*)$/);
                            if (!match) {
                                if (last.active) {
                                    last = { active: false, query: '', coords: null, range: null };
                                    opts.onTrigger(last);
                                }
                                return;
                            }
                            const slashWithQuery = match[1];
                            const query = slashWithQuery.slice(1);
                            const triggerFrom = $from.pos - slashWithQuery.length;
                            const triggerTo = $from.pos;

                            // Don't show menu if more than 24 chars typed without space (looks like a URL)
                            if (query.length > 24) return;

                            const coords = view.coordsAtPos(triggerTo);
                            const next: SlashTriggerInfo = {
                                active: true,
                                query,
                                coords: { left: coords.left, top: coords.top, bottom: coords.bottom },
                                range: { from: triggerFrom, to: triggerTo },
                            };
                            if (
                                next.active !== last.active ||
                next.query !== last.query ||
                next.range?.from !== last.range?.from ||
                next.range?.to !== last.range?.to
                            ) {
                                last = next;
                                opts.onTrigger(next);
                            }

                            // suppress unused warning
                            void doc;
                        },
                        destroy: () => {
                            opts.onTrigger({ active: false, query: '', coords: null, range: null });
                        },
                    };
                },
            }),
        ];
    },
});
