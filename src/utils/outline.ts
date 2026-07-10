//src/utils/outline.ts

export interface HeadingItem {
    level: number;
    text: string;
    line: number;
}

// Parse headings, skipping fenced code blocks so mermaid/code comments
// starting with # don't pollute the outline
export const parseHeadings = (markdown: string): HeadingItem[] => {
    const items: HeadingItem[] = [];
    let inFence = false;
    markdown.split('\n').forEach((raw, i) => {
        const line = raw.trimEnd();
        if (/^(```|~~~)/.test(line.trimStart())) {
            inFence = !inFence;
            return;
        }
        if (inFence) return;
        const m = line.match(/^(#{1,6})\s+(.+)/);
        if (m) {
            items.push({
                level: m[1].length,
                text: m[2].replace(/[*_`~]/g, '').trim(),
                line: i + 1,
            });
        }
    });
    return items;
};
