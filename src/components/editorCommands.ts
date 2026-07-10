//src/components/editorCommands.ts

import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

// Wrap the selection with an inline mark (e.g. ** for bold), or unwrap
// if the selection is already wrapped
export const toggleWrap = (view: EditorView, mark: string, placeholder = 'text'): boolean => {
    const { state } = view;
    const spec = state.changeByRange((range) => {
        const { from, to } = range;
        const selected = state.sliceDoc(from, to);
        // Selection includes the marks themselves -> unwrap
        if (selected.length >= mark.length * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
            const inner = selected.slice(mark.length, selected.length - mark.length);
            return {
                changes: { from, to, insert: inner },
                range: EditorSelection.range(from, from + inner.length),
            };
        }
        const before = state.sliceDoc(Math.max(0, from - mark.length), from);
        const after = state.sliceDoc(to, Math.min(state.doc.length, to + mark.length));
        if (before === mark && after === mark) {
            return {
                changes: [
                    { from: from - mark.length, to: from, insert: '' },
                    { from: to, to: to + mark.length, insert: '' },
                ],
                range: EditorSelection.range(from - mark.length, to - mark.length),
            };
        }
        const text = state.sliceDoc(from, to) || placeholder;
        return {
            changes: { from, to, insert: mark + text + mark },
            range: EditorSelection.range(from + mark.length, from + mark.length + text.length),
        };
    });
    view.dispatch(spec, { scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return true;
};

// Toggle a per-line prefix across all selected lines (headings, quotes, lists)
export const toggleLinePrefix = (
    view: EditorView,
    prefix: string | ((index: number) => string),
    strip: RegExp
): boolean => {
    const { state } = view;
    const range = state.selection.main;
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;

    // If every selected line already has the prefix, remove it; otherwise add it
    let allPrefixed = true;
    for (let n = startLine; n <= endLine; n++) {
        if (!strip.test(state.doc.line(n).text)) {
            allPrefixed = false;
            break;
        }
    }

    const changes = [];
    for (let n = startLine; n <= endLine; n++) {
        const line = state.doc.line(n);
        const stripped = line.text.replace(strip, '');
        const linePrefix = typeof prefix === 'function' ? prefix(n - startLine) : prefix;
        changes.push({
            from: line.from,
            to: line.to,
            insert: allPrefixed ? stripped : linePrefix + stripped,
        });
    }
    view.dispatch({ changes, scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return true;
};

export const setHeading = (view: EditorView, level: number): boolean => {
    const { state } = view;
    const range = state.selection.main;
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    const changes = [];
    for (let n = startLine; n <= endLine; n++) {
        const line = state.doc.line(n);
        const stripped = line.text.replace(/^#{1,6}\s+/, '');
        const current = line.text.match(/^(#{1,6})\s/);
        const insert = current && current[1].length === level
            ? stripped
            : '#'.repeat(level) + ' ' + stripped;
        changes.push({ from: line.from, to: line.to, insert });
    }
    view.dispatch({ changes, scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return true;
};

export const insertLink = (view: EditorView): boolean => {
    const { state } = view;
    const spec = state.changeByRange((range) => {
        const text = state.sliceDoc(range.from, range.to) || 'link text';
        const insert = `[${text}](url)`;
        const urlStart = range.from + text.length + 3;
        return {
            changes: { from: range.from, to: range.to, insert },
            range: EditorSelection.range(urlStart, urlStart + 3),
        };
    });
    view.dispatch(spec, { scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return true;
};

export const insertImage = (view: EditorView): boolean => {
    const { state } = view;
    const spec = state.changeByRange((range) => {
        const text = state.sliceDoc(range.from, range.to) || 'alt text';
        const insert = `![${text}](url)`;
        const urlStart = range.from + text.length + 4;
        return {
            changes: { from: range.from, to: range.to, insert },
            range: EditorSelection.range(urlStart, urlStart + 3),
        };
    });
    view.dispatch(spec, { scrollIntoView: true, userEvent: 'input' });
    view.focus();
    return true;
};

const insertBlock = (view: EditorView, block: string, selectFrom?: number, selectTo?: number): boolean => {
    const { state } = view;
    const range = state.selection.main;
    const line = state.doc.lineAt(range.from);
    const needsNewline = line.text.length > 0;
    const insert = (needsNewline ? '\n\n' : '') + block;
    const base = line.to + (needsNewline ? 2 : 0);
    view.dispatch({
        changes: { from: line.to, insert },
        selection: selectFrom !== undefined
            ? EditorSelection.range(base + selectFrom, base + (selectTo ?? selectFrom))
            : { anchor: line.to + insert.length },
        scrollIntoView: true,
        userEvent: 'input',
    });
    view.focus();
    return true;
};

export const insertTable = (view: EditorView): boolean =>
    insertBlock(
        view,
        '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n',
        2, 10
    );

export const insertCodeBlock = (view: EditorView): boolean =>
    insertBlock(view, '```language\ncode\n```\n', 3, 11);

export const insertHorizontalRule = (view: EditorView): boolean =>
    insertBlock(view, '---\n');

export const formatKeymap = keymap.of([
    { key: 'Mod-b', run: (v) => toggleWrap(v, '**', 'bold') },
    { key: 'Mod-i', run: (v) => toggleWrap(v, '*', 'italic') },
    { key: 'Mod-e', run: (v) => toggleWrap(v, '`', 'code') },
    { key: 'Mod-Shift-x', run: (v) => toggleWrap(v, '~~', 'strikethrough') },
    { key: 'Mod-k', run: insertLink },
    { key: 'Mod-1', run: (v) => setHeading(v, 1) },
    { key: 'Mod-2', run: (v) => setHeading(v, 2) },
    { key: 'Mod-3', run: (v) => setHeading(v, 3) },
]);
