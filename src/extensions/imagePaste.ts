//src/extensions/imagePaste.ts

import { EditorView } from '@codemirror/view';

const insertImageAtSelection = (view: EditorView, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
        const dataUrl = reader.result as string;
        const name = file.name.replace(/\.[^.]+$/, '') || 'image';
        const { from, to } = view.state.selection.main;
        view.dispatch({
            changes: { from, to, insert: `![${name}](${dataUrl})` },
            userEvent: 'input',
        });
    };
    reader.readAsDataURL(file);
};

const firstImage = (files: FileList | undefined | null): File | null => {
    if (!files) return null;
    for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) return file;
    }
    return null;
};

// Paste or drag-drop an image file -> inserted as a base64 data URL,
// keeping the document fully self-contained
export const imagePaste = EditorView.domEventHandlers({
    paste(event, view) {
        const image = firstImage(event.clipboardData?.files);
        if (!image) return false;
        event.preventDefault();
        insertImageAtSelection(view, image);
        return true;
    },
    drop(event, view) {
        const image = firstImage(event.dataTransfer?.files);
        if (!image) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
            view.dispatch({ selection: { anchor: pos } });
        }
        insertImageAtSelection(view, image);
        return true;
    },
});
