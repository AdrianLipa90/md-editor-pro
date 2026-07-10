//src/components/MarkdownRenderers.tsx

import type { Components } from 'react-markdown';
// Async variant lazy-loads each Prism language on demand instead of
// bundling all of them into the main chunk
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidDiagram from './MermaidDiagram';

export const getMarkdownComponents = (isDark: boolean): Components => ({
    // Unwrap the default <pre>: block code is fully rendered by the code
    // component below (SyntaxHighlighter / Mermaid bring their own containers)
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
        const match = /language-(\w+)/.exec(className || '');
        const codeText = String(children).replace(/\n$/, '');
        // react-markdown v9+ no longer passes an `inline` prop: fenced blocks
        // carry a language- className, so treat tagged or multi-line code as block
        const isBlock = match !== null || codeText.includes('\n');

        if (isBlock) {
            if (match?.[1] === 'mermaid') {
                return <MermaidDiagram chart={codeText} isDark={isDark} />;
            }
            return (
                <SyntaxHighlighter
                    style={isDark ? vscDarkPlus : oneLight}
                    language={match?.[1] ?? 'text'}
                    PreTag="div"
                    customStyle={{ borderRadius: '0.5rem', margin: '0 0 1rem 0' }}
                >
                    {codeText}
                </SyntaxHighlighter>
            );
        }

        return (
            <code className="bg-gray-100 dark:bg-[#343942] px-1.5 py-0.5 rounded text-sm font-mono text-red-600 dark:text-[#ff7b72]">
                {children}
            </code>
        );
    }
});
