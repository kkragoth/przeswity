import { nodeToMarkdown } from '@/editor/io/markdown';
import { MarkdownInlineDiff, MarkdownSideBySide } from '@/containers/editor/components/versions/MarkdownDiffView';
import type { JSONNode } from '@/editor/versions/diffDoc';

interface DiffMarkdownViewProps {
    diffJson: JSONNode;
    olderJson?: JSONNode;
    newerJson?: JSONNode;
    olderLabel: string;
    newerLabel: string;
    useSbs: boolean;
    sbsAvailable: boolean;
}

export function DiffMarkdownView({
    diffJson,
    olderJson,
    newerJson,
    olderLabel,
    newerLabel,
    useSbs,
    sbsAvailable,
}: DiffMarkdownViewProps) {
    if (useSbs && olderJson && newerJson) {
        return (
            <MarkdownSideBySide
                olderJson={olderJson}
                newerJson={newerJson}
                olderLabel={olderLabel}
                newerLabel={newerLabel}
            />
        );
    }
    if (sbsAvailable && olderJson && newerJson) {
        return <MarkdownInlineDiff olderJson={olderJson} newerJson={newerJson} />;
    }
    return <pre className="md-diff md-diff-sbs">{nodeToMarkdown(diffJson)}</pre>;
}
