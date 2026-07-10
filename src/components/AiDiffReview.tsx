//src/components/AiDiffReview.tsx

import React, { useMemo } from 'react';
import { diffLines } from 'diff';
import { Check, X } from 'lucide-react';

export interface PendingAiChange {
    actionLabel: string;
    from: number;
    to: number;
    original: string;
    replacement: string;
}

interface AiDiffReviewProps {
    change: PendingAiChange;
    onAccept: () => void;
    onReject: () => void;
}

const AiDiffReview: React.FC<AiDiffReviewProps> = ({ change, onAccept, onReject }) => {
    const parts = useMemo(
        () => diffLines(change.original, change.replacement),
        [change.original, change.replacement]
    );

    const stats = useMemo(() => {
        let added = 0;
        let removed = 0;
        for (const p of parts) {
            const n = p.count ?? p.value.split('\n').filter((l, i, a) => i < a.length - 1 || l !== '').length;
            if (p.added) added += n;
            else if (p.removed) removed += n;
        }
        return { added, removed };
    }, [parts]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onReject}>
            <div
                className="bg-white dark:bg-[#161b22] rounded-lg shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-3 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-[#e6edf3]">
                            Review AI change — {change.actionLabel}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-[#7d8590] mt-0.5">
                            <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
                            {' / '}
                            <span className="text-red-600 dark:text-red-400">−{stats.removed}</span>
                            {' lines · nothing is saved until you accept'}
                        </p>
                    </div>
                </div>

                {/* Diff body */}
                <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-[#0d1117]">
                    <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
                        {parts.map((part, i) => {
                            const cls = part.added
                                ? 'block bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200'
                                : part.removed
                                    ? 'block bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-300 line-through decoration-red-400/60'
                                    : 'block text-gray-500 dark:text-[#7d8590]';
                            const prefix = part.added ? '+ ' : part.removed ? '− ' : '  ';
                            return (
                                <span key={i} className={cls}>
                                    {part.value.replace(/\n$/, '').split('\n').map((line, j) => (
                                        <span key={j} className="block px-2">{prefix}{line}</span>
                                    ))}
                                </span>
                            );
                        })}
                    </pre>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-t border-gray-200 dark:border-[#30363d] flex justify-end space-x-2 flex-shrink-0">
                    <button
                        onClick={onReject}
                        className="px-4 py-2 rounded-lg text-sm flex items-center space-x-1.5 text-gray-700 dark:text-[#e6edf3] bg-gray-100 dark:bg-[#21262d] hover:bg-gray-200 dark:hover:bg-[#30363d] transition-colors"
                    >
                        <X size={15} />
                        <span>Discard</span>
                    </button>
                    <button
                        onClick={onAccept}
                        className="px-4 py-2 rounded-lg text-sm flex items-center space-x-1.5 text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                        <Check size={15} />
                        <span>Accept change</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiDiffReview;
