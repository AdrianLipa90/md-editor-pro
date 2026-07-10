//src/components/Outline.tsx

import React, { useMemo } from 'react';
import { parseHeadings, type HeadingItem } from '../utils/outline';

export type { HeadingItem };

interface OutlineProps {
    markdown: string;
    onJump: (item: HeadingItem, index: number) => void;
}

const Outline: React.FC<OutlineProps> = ({ markdown, onJump }) => {
    const headings = useMemo(() => parseHeadings(markdown), [markdown]);

    return (
        <div className="outline-pane w-56 flex-shrink-0 border-r border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#161b22] flex flex-col min-h-0">
            <div className="px-4 py-2 text-sm text-gray-600 dark:text-[#7d8590] border-b border-gray-200 dark:border-[#30363d] flex-shrink-0">
                Outline
            </div>
            <div className="flex-1 overflow-auto py-2">
                {headings.length === 0 && (
                    <p className="px-4 text-xs text-gray-400 dark:text-[#6e7681]">No headings yet</p>
                )}
                {headings.map((h, i) => (
                    <button
                        key={`${h.line}-${i}`}
                        onClick={() => onJump(h, i)}
                        className="block w-full text-left px-2 py-1 text-sm truncate text-gray-700 dark:text-[#adbac7] hover:bg-gray-200 dark:hover:bg-[#21262d] hover:text-gray-900 dark:hover:text-[#e6edf3] transition-colors"
                        style={{ paddingLeft: `${8 + (h.level - 1) * 14}px` }}
                        title={h.text}
                    >
                        {h.text}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Outline;
