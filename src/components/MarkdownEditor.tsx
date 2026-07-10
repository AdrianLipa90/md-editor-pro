//src/components/MarkdownEditor.tsx

import React, { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { EditorView } from '@codemirror/view';
import {
  Eye, Edit3, Columns, Copy, Download, Upload, HelpCircle,
  Sun, Moon, FileDown, Printer, Save, PanelLeft
} from 'lucide-react';
import MarkdownGuide from './MarkdownGuide';
import Toolbar from './Toolbar';
import Outline, { type HeadingItem } from './Outline';
import TabsBar from './TabsBar';
import AiMenu from './AiMenu';
import AiDiffReview, { type PendingAiChange } from './AiDiffReview';
import { runAiCompletion, AI_ACTIONS, type AiAction, type AiSettings } from '../utils/ai';
import { getMarkdownComponents } from './MarkdownRenderers';
import { formatKeymap } from './editorCommands';
import { imagePaste } from '../extensions/imagePaste';
import { downloadHtml } from '../utils/exportHtml';
import {
  supportsFileSystemAccess, openMarkdownFile, saveToHandle, saveAsMarkdownFile,
  type FSFileHandle
} from '../utils/fileSystem';
import { useDocuments } from '../hooks/useDocuments';
import 'katex/dist/katex.min.css';

const DEFAULT_MARKDOWN = `# Welcome to Markdown Editor Pro

This is a **powerful** markdown editor with *math support*!

## Features

- [x] IDE-style split view with live preview
- [x] Multiple documents in tabs — autosaved locally
- [x] Outline pane — click a heading to jump
- [x] Open & save real files (Ctrl+S)
- [x] Paste or drop images straight into the editor
- [x] Formatting toolbar and keyboard shortcuts (try **Ctrl+B**)
- [x] Math equations with KaTeX
- [x] Mermaid diagrams
- [x] Export to HTML or print to PDF
- [x] Works offline — installable as an app

## Math Examples

Inline math: $E = mc^2$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Complex equation:
$$
f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n
$$

## Mermaid Diagrams

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: I am good thanks!
\`\`\`

## Code Examples

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

## Tables

| Feature | Supported |
|---------|-----------|
| Tables  | ✅        |
| Math    | ✅        |
| Code    | ✅        |

> This is a blockquote with some important information!

### Lists

1. First item
2. Second item
   - Nested item
   - Another nested item

---

Happy writing! 🚀`;

type ViewMode = 'edit' | 'split' | 'preview';
type Theme = 'light' | 'dark';

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem('md-editor-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const MarkdownEditor: React.FC = () => {
  const { docs, active, setContent, createDoc, switchDoc, closeDoc } = useDocuments(DEFAULT_MARKDOWN);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showOutline, setShowOutline] = useState(true);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [statusMsg, setStatusMsg] = useState('Autosaved');
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [pendingAi, setPendingAi] = useState<PendingAiChange | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const fileHandlesRef = useRef(new Map<string, FSFileHandle>());
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const markdownText = active.content;

  // Defer preview updates so typing stays responsive on large documents
  const deferredMarkdown = useDeferredValue(markdownText);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('md-editor-theme', theme);
  }, [theme]);

  const components = useMemo(() => getMarkdownComponents(theme === 'dark'), [theme]);

  const extensions = useMemo(() => {
    const base = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      EditorView.lineWrapping,
      formatKeymap,
      imagePaste,
    ];
    if (typewriterMode) {
      base.push(EditorView.updateListener.of((u) => {
        if (u.docChanged) {
          const head = u.state.selection.main.head;
          // Dispatching inside an update listener is not allowed; defer
          setTimeout(() => {
            u.view.dispatch({ effects: EditorView.scrollIntoView(head, { y: 'center' }) });
          }, 0);
        }
      }));
    }
    return base;
  }, [typewriterMode]);

  const handleEditorUpdate = useCallback((vu: ViewUpdate) => {
    if (vu.selectionSet || vu.docChanged) {
      const head = vu.state.selection.main.head;
      const line = vu.state.doc.lineAt(head);
      setCursorPos({ line: line.number, col: head - line.from + 1 });
    }
  }, []);

  // Bidirectional proportional scroll sync with a lock so one side
  // driving the other doesn't echo back
  const syncLockRef = useRef<'editor' | 'preview' | null>(null);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    view.scrollDOM.addEventListener('scroll', () => {
      if (viewModeRef.current !== 'split') return;
      if (syncLockRef.current === 'preview') return;
      const preview = previewRef.current;
      if (!preview) return;
      const el = view.scrollDOM;
      const editorScrollable = el.scrollHeight - el.clientHeight;
      const previewScrollable = preview.scrollHeight - preview.clientHeight;
      if (editorScrollable <= 0 || previewScrollable <= 0) return;
      syncLockRef.current = 'editor';
      preview.scrollTop = (el.scrollTop / editorScrollable) * previewScrollable;
      requestAnimationFrame(() => { syncLockRef.current = null; });
    });
  }, []);

  const handlePreviewScroll = useCallback(() => {
    if (viewModeRef.current !== 'split') return;
    if (syncLockRef.current === 'editor') return;
    const view = editorViewRef.current;
    const preview = previewRef.current;
    if (!view || !preview) return;
    const el = view.scrollDOM;
    const editorScrollable = el.scrollHeight - el.clientHeight;
    const previewScrollable = preview.scrollHeight - preview.clientHeight;
    if (editorScrollable <= 0 || previewScrollable <= 0) return;
    syncLockRef.current = 'preview';
    el.scrollTop = (preview.scrollTop / previewScrollable) * editorScrollable;
    requestAnimationFrame(() => { syncLockRef.current = null; });
  }, []);

  const flashStatus = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg('Autosaved'), 2500);
  }, []);

  // --- File operations ---

  const handleOpenFile = useCallback(async () => {
    if (supportsFileSystemAccess()) {
      const result = await openMarkdownFile();
      if (result) {
        const id = createDoc(result.content, result.name);
        fileHandlesRef.current.set(id, result.handle);
        flashStatus(`Opened ${result.name}`);
      }
    } else {
      uploadInputRef.current?.click();
    }
  }, [createDoc, flashStatus]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/markdown' || file.name.endsWith('.md'))) {
      const reader = new FileReader();
      reader.onload = (e) => {
        createDoc((e.target?.result as string) ?? '', file.name);
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  }, [createDoc]);

  const handleSaveFile = useCallback(async () => {
    const existing = fileHandlesRef.current.get(active.id);
    if (existing) {
      const ok = await saveToHandle(existing, active.content);
      flashStatus(ok ? `Saved ${existing.name}` : 'Save failed');
      return;
    }
    if (supportsFileSystemAccess()) {
      const handle = await saveAsMarkdownFile(active.content, `${active.title.replace(/[^\w\- ]/g, '') || 'document'}.md`);
      if (handle) {
        fileHandlesRef.current.set(active.id, handle);
        flashStatus(`Saved ${handle.name}`);
      }
      return;
    }
    // Fallback: plain download
    const blob = new Blob([active.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [active.id, active.content, active.title, flashStatus]);

  // Ctrl+S saves to file
  const saveRef = useRef(handleSaveFile);
  saveRef.current = handleSaveFile;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleCloseDoc = useCallback((id: string) => {
    fileHandlesRef.current.delete(id);
    closeDoc(id);
  }, [closeDoc]);

  const handleDownloadMd = useCallback(() => {
    const blob = new Blob([markdownText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [markdownText]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      flashStatus('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [markdownText, flashStatus]);

  // Exports need the preview rendered in light theme; temporarily switch,
  // run the action, then restore
  const withLightPreview = useCallback((action: () => void) => {
    const wasEdit = viewModeRef.current === 'edit';
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasEdit) setViewMode('split');
    if (wasDark) setTheme('light');
    if (wasEdit || wasDark) {
      setTimeout(() => {
        action();
        if (wasDark) setTimeout(() => setTheme('dark'), 200);
      }, 900);
    } else {
      action();
    }
  }, []);

  // --- AI assist (bring your own key) ---

  const handleAiRun = useCallback(async (action: AiAction, settings: AiSettings) => {
    const view = editorViewRef.current;
    const doc = active.content;
    let from = 0;
    let to = doc.length;
    let text = doc;
    if (view && (action === 'improve' || action === 'grammar')) {
      const sel = view.state.selection.main;
      if (!sel.empty) {
        from = sel.from;
        to = sel.to;
        text = view.state.sliceDoc(from, to);
      }
    }
    setAiBusy(true);
    setStatusMsg('AI thinking…');
    try {
      const result = await runAiCompletion(settings, action, text);
      // Never apply directly: stage the change for diff review so nothing
      // reaches the document (or autosave) until the user accepts it
      if (action === 'summarize') {
        setPendingAi({
          actionLabel: AI_ACTIONS[action].label,
          from: doc.length,
          to: doc.length,
          original: '',
          replacement: '\n\n---\n\n## Summary\n\n' + result + '\n',
        });
      } else if (action === 'continue') {
        setPendingAi({
          actionLabel: AI_ACTIONS[action].label,
          from: doc.length,
          to: doc.length,
          original: '',
          replacement: (doc.endsWith('\n') ? '\n' : '\n\n') + result + '\n',
        });
      } else {
        setPendingAi({
          actionLabel: AI_ACTIONS[action].label,
          from,
          to,
          original: text,
          replacement: result,
        });
      }
      setStatusMsg('Review the AI change');
    } catch (err) {
      console.error(err);
      flashStatus(err instanceof Error ? err.message.slice(0, 80) : 'AI request failed');
    } finally {
      setAiBusy(false);
    }
  }, [active.content, flashStatus]);

  const acceptAiChange = useCallback(() => {
    if (!pendingAi) return;
    const view = editorViewRef.current;
    if (view) {
      // Apply through the editor so it stays undoable with Ctrl+Z
      view.dispatch({ changes: { from: pendingAi.from, to: pendingAi.to, insert: pendingAi.replacement } });
    } else {
      const doc = active.content;
      setContent(doc.slice(0, pendingAi.from) + pendingAi.replacement + doc.slice(pendingAi.to));
    }
    setPendingAi(null);
    flashStatus('AI change applied — Ctrl+Z to undo');
  }, [pendingAi, active.content, setContent, flashStatus]);

  const rejectAiChange = useCallback(() => {
    setPendingAi(null);
    flashStatus('AI change discarded');
  }, [flashStatus]);

  const handleExportHtml = useCallback(() => {
    withLightPreview(() => {
      const el = document.querySelector('.markdown-content');
      if (el) downloadHtml(el.innerHTML, 'document');
    });
  }, [withLightPreview]);

  const handlePrint = useCallback(() => {
    withLightPreview(() => window.print());
  }, [withLightPreview]);

  // --- Outline navigation ---

  const jumpToHeading = useCallback((item: HeadingItem, index: number) => {
    const view = editorViewRef.current;
    if (viewModeRef.current !== 'preview' && view) {
      const lineNo = Math.min(item.line, view.state.doc.lines);
      const line = view.state.doc.line(lineNo);
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'start' }),
      });
      view.focus();
    } else if (previewRef.current) {
      const headings = previewRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings[index]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, []);

  const handleDividerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const container = contentRef.current;
    if (!container) return;
    const divider = event.currentTarget;
    divider.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplitRatio(Math.min(0.8, Math.max(0.2, ratio)));
    };
    const onUp = () => {
      divider.removeEventListener('pointermove', onMove);
      divider.removeEventListener('pointerup', onUp);
    };
    divider.addEventListener('pointermove', onMove);
    divider.addEventListener('pointerup', onUp);
  }, []);

  const showEditor = viewMode !== 'preview';
  const showPreview = viewMode !== 'edit';

  const modeButton = (mode: ViewMode, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setViewMode(mode)}
      className={`px-3 py-1 rounded flex items-center space-x-1 transition-all ${viewMode === mode
        ? 'bg-white text-blue-600 shadow-sm'
        : 'text-white/80 hover:text-white'
        }`}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );

  const headerButton = (icon: React.ReactNode, label: string, onClick: () => void, isActive = false) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}
      title={label}
    >
      {icon}
    </button>
  );

  return (
    <div className={`app-container ${focusMode ? 'focus-mode' : ''} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-full rounded-lg'} bg-white dark:bg-[#0d1117] shadow-2xl overflow-hidden border border-gray-200 dark:border-[#30363d] flex flex-col`}>
      {/* Header */}
      <div className="app-header bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {headerButton(<PanelLeft size={20} />, 'Toggle outline', () => setShowOutline(!showOutline), showOutline)}
            <h1 className="text-xl font-bold">Markdown Editor</h1>
          </div>
          <div className="flex items-center space-x-2">
            {headerButton(<HelpCircle size={20} />, 'Markdown Guide', () => setShowGuide(true))}
            {headerButton(<Upload size={20} />, 'Open .md file', handleOpenFile)}
            <input
              ref={uploadInputRef}
              type="file"
              accept=".md,.markdown"
              onChange={handleFileUpload}
              className="hidden"
            />
            {headerButton(<Save size={20} />, 'Save to file (Ctrl+S)', handleSaveFile)}
            {headerButton(<Download size={20} />, 'Download as .md', handleDownloadMd)}
            {headerButton(<FileDown size={20} />, 'Export as HTML', handleExportHtml)}
            {headerButton(<Printer size={20} />, 'Print / Save as PDF', handlePrint)}
            {headerButton(<Copy size={20} />, 'Copy to clipboard', handleCopy)}
            <AiMenu busy={aiBusy} onRun={handleAiRun} />
            {headerButton(
              theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />,
              theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
              () => setTheme(theme === 'dark' ? 'light' : 'dark')
            )}

            {/* View Mode Toggle */}
            <div className="bg-white/10 rounded-lg p-1 flex">
              {modeButton('edit', <Edit3 size={16} />, 'Edit')}
              {modeButton('split', <Columns size={16} />, 'Split')}
              {modeButton('preview', <Eye size={16} />, 'Preview')}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Toggle fullscreen"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isFullscreen ? (
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                ) : (
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Document Tabs */}
      <div className="app-tabs">
        <TabsBar
          docs={docs}
          activeId={active.id}
          onSwitch={switchDoc}
          onClose={handleCloseDoc}
          onNew={() => createDoc('')}
        />
      </div>

      {/* Formatting Toolbar */}
      {showEditor && (
        <div className="app-toolbar">
          <Toolbar getView={() => editorViewRef.current} />
        </div>
      )}

      {/* Content Area */}
      <div ref={contentRef} className="app-content flex flex-1 min-h-0">
        {showOutline && (
          <Outline markdown={deferredMarkdown} onJump={jumpToHeading} />
        )}

        {showEditor && (
          <div
            className="editor-pane flex flex-col min-w-0"
            style={{ flexBasis: viewMode === 'split' ? `${splitRatio * 100}%` : '100%' }}
          >
            <div className="bg-gray-50 dark:bg-[#21262d] px-4 py-2 text-sm text-gray-600 dark:text-[#7d8590] border-b dark:border-[#30363d] flex-shrink-0">
              <span>Markdown Source</span>
              <span className="ml-4 text-xs hidden xl:inline">Ctrl+F search · Ctrl+S save · paste images directly</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <CodeMirror
                value={markdownText}
                onChange={setContent}
                onUpdate={handleEditorUpdate}
                onCreateEditor={handleCreateEditor}
                extensions={extensions}
                theme={theme === 'dark' ? githubDark : githubLight}
                height="100%"
                style={{ height: '100%' }}
                placeholder="Type your markdown here..."
              />
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          <div
            onPointerDown={handleDividerPointerDown}
            className="split-divider w-1.5 cursor-col-resize bg-gray-200 dark:bg-[#30363d] hover:bg-blue-400 dark:hover:bg-[#58a6ff] active:bg-blue-500 transition-colors flex-shrink-0 touch-none"
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize"
          />
        )}

        {showPreview && (
          <div className="preview-pane flex flex-col flex-1 min-w-0">
            <div className="preview-label bg-gray-50 dark:bg-[#21262d] px-4 py-2 text-sm text-gray-600 dark:text-[#7d8590] border-b dark:border-[#30363d] flex-shrink-0">
              <span>Preview</span>
            </div>
            <div ref={previewRef} onScroll={handlePreviewScroll} className="preview-scroll flex-1 overflow-auto p-6 markdown-scrollbar bg-white dark:bg-[#0d1117]">
              <div className="markdown-content max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={components}
                >
                  {deferredMarkdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="app-statusbar bg-gray-100 dark:bg-[#21262d] px-4 py-2 text-xs text-gray-600 dark:text-[#7d8590] border-t dark:border-[#30363d] flex justify-between items-center flex-shrink-0">
        <div className="flex space-x-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span>Characters: {markdownText.length}</span>
          <span>Words: {markdownText.trim() ? markdownText.trim().split(/\s+/).length : 0}</span>
          <span>Lines: {markdownText.split('\n').length}</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`px-1.5 py-0.5 rounded transition-colors ${focusMode ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-[#30363d]'}`}
            title="Focus mode: dim all lines except the current one"
          >
            Focus
          </button>
          <button
            onClick={() => setTypewriterMode(!typewriterMode)}
            className={`px-1.5 py-0.5 rounded transition-colors ${typewriterMode ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 dark:hover:bg-[#30363d]'}`}
            title="Typewriter mode: keep the cursor line vertically centered"
          >
            Typewriter
          </button>
          <span className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{statusMsg}</span>
          </span>
        </div>
      </div>

      {/* AI Diff Review Modal */}
      {pendingAi && (
        <AiDiffReview change={pendingAi} onAccept={acceptAiChange} onReject={rejectAiChange} />
      )}

      {/* Help Guide Modal */}
      <MarkdownGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
};

export default MarkdownEditor;
