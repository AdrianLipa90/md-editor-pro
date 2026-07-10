//src/components/TabsBar.tsx

import React from 'react';
import { X, Plus } from 'lucide-react';
import type { Doc } from '../hooks/useDocuments';

interface TabsBarProps {
    docs: Doc[];
    activeId: string;
    onSwitch: (id: string) => void;
    onClose: (id: string) => void;
    onNew: () => void;
}

const TabsBar: React.FC<TabsBarProps> = ({ docs, activeId, onSwitch, onClose, onNew }) => (
    <div className="flex items-stretch overflow-x-auto bg-gray-100 dark:bg-[#0d1117] border-b border-gray-200 dark:border-[#30363d] flex-shrink-0">
        {docs.map((doc) => {
            const isActive = doc.id === activeId;
            return (
                <div
                    key={doc.id}
                    onClick={() => onSwitch(doc.id)}
                    className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 text-sm cursor-pointer border-r border-gray-200 dark:border-[#30363d] max-w-[180px] select-none ${isActive
                        ? 'bg-white dark:bg-[#161b22] text-gray-900 dark:text-[#e6edf3] border-t-2 border-t-blue-500'
                        : 'text-gray-500 dark:text-[#7d8590] hover:bg-gray-200 dark:hover:bg-[#161b22]/60 border-t-2 border-t-transparent'
                        }`}
                    title={doc.title}
                >
                    <span className="truncate">{doc.title}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(doc.id); }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-[#30363d] transition-opacity flex-shrink-0"
                        title="Close document"
                    >
                        <X size={13} />
                    </button>
                </div>
            );
        })}
        <button
            onClick={onNew}
            className="px-2.5 text-gray-500 dark:text-[#7d8590] hover:bg-gray-200 dark:hover:bg-[#161b22] hover:text-gray-900 dark:hover:text-[#e6edf3] transition-colors flex-shrink-0"
            title="New document"
        >
            <Plus size={16} />
        </button>
    </div>
);

export default TabsBar;
