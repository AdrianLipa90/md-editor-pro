//src/components/Toolbar.tsx

import React from 'react';
import type { EditorView } from '@codemirror/view';
import {
    Bold, Italic, Strikethrough, Code, Code2, Link, Image,
    List, ListOrdered, ListTodo, TextQuote, Table, Minus,
    Heading1, Heading2, Heading3
} from 'lucide-react';
import {
    toggleWrap, toggleLinePrefix, setHeading,
    insertLink, insertImage, insertTable, insertCodeBlock, insertHorizontalRule
} from './editorCommands';

interface ToolbarProps {
    getView: () => EditorView | null;
}

const Toolbar: React.FC<ToolbarProps> = ({ getView }) => {
    const run = (fn: (view: EditorView) => boolean) => () => {
        const view = getView();
        if (view) fn(view);
    };

    const button = (icon: React.ReactNode, label: string, onClick: () => void) => (
        <button
            onClick={onClick}
            className="p-1.5 rounded text-gray-600 dark:text-[#7d8590] hover:bg-gray-200 dark:hover:bg-[#30363d] hover:text-gray-900 dark:hover:text-[#e6edf3] transition-colors"
            title={label}
        >
            {icon}
        </button>
    );

    const divider = <span className="w-px h-5 bg-gray-300 dark:bg-[#30363d] mx-1" />;

    return (
        <div className="flex items-center flex-wrap gap-0.5 px-2 py-1 bg-gray-50 dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d] flex-shrink-0">
            {button(<Heading1 size={16} />, 'Heading 1 (Ctrl+1)', run((v) => setHeading(v, 1)))}
            {button(<Heading2 size={16} />, 'Heading 2 (Ctrl+2)', run((v) => setHeading(v, 2)))}
            {button(<Heading3 size={16} />, 'Heading 3 (Ctrl+3)', run((v) => setHeading(v, 3)))}
            {divider}
            {button(<Bold size={16} />, 'Bold (Ctrl+B)', run((v) => toggleWrap(v, '**', 'bold')))}
            {button(<Italic size={16} />, 'Italic (Ctrl+I)', run((v) => toggleWrap(v, '*', 'italic')))}
            {button(<Strikethrough size={16} />, 'Strikethrough (Ctrl+Shift+X)', run((v) => toggleWrap(v, '~~', 'strikethrough')))}
            {divider}
            {button(<Code size={16} />, 'Inline code (Ctrl+E)', run((v) => toggleWrap(v, '`', 'code')))}
            {button(<Code2 size={16} />, 'Code block', run(insertCodeBlock))}
            {divider}
            {button(<Link size={16} />, 'Link (Ctrl+K)', run(insertLink))}
            {button(<Image size={16} />, 'Image', run(insertImage))}
            {divider}
            {button(<List size={16} />, 'Bullet list', run((v) => toggleLinePrefix(v, '- ', /^-\s+(?!\[)/)))}
            {button(<ListOrdered size={16} />, 'Numbered list', run((v) => toggleLinePrefix(v, (i) => `${i + 1}. `, /^\d+\.\s+/)))}
            {button(<ListTodo size={16} />, 'Task list', run((v) => toggleLinePrefix(v, '- [ ] ', /^-\s+\[[ x]\]\s+/)))}
            {divider}
            {button(<TextQuote size={16} />, 'Blockquote', run((v) => toggleLinePrefix(v, '> ', /^>\s+/)))}
            {button(<Table size={16} />, 'Table', run(insertTable))}
            {button(<Minus size={16} />, 'Horizontal rule', run(insertHorizontalRule))}
        </div>
    );
};

export default Toolbar;
