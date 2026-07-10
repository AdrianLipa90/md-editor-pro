//src/utils/fileSystem.ts

// Minimal typings for the File System Access API (Chrome/Edge)
interface FilePickerType {
    description: string;
    accept: Record<string, string[]>;
}

export interface FSFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
    name: string;
}

interface FSWindow {
    showOpenFilePicker?(options: { types: FilePickerType[] }): Promise<FSFileHandle[]>;
    showSaveFilePicker?(options: { suggestedName: string; types: FilePickerType[] }): Promise<FSFileHandle>;
}

const MD_TYPES: FilePickerType[] = [
    { description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } },
];

const fsWindow = window as unknown as FSWindow;

export const supportsFileSystemAccess = (): boolean =>
    typeof fsWindow.showOpenFilePicker === 'function';

export const openMarkdownFile = async (): Promise<{ handle: FSFileHandle; name: string; content: string } | null> => {
    if (!fsWindow.showOpenFilePicker) return null;
    try {
        const [handle] = await fsWindow.showOpenFilePicker({ types: MD_TYPES });
        const file = await handle.getFile();
        const content = await file.text();
        return { handle, name: file.name, content };
    } catch {
        return null; // user cancelled the picker
    }
};

export const saveToHandle = async (handle: FSFileHandle, content: string): Promise<boolean> => {
    try {
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
    } catch {
        return false;
    }
};

export const saveAsMarkdownFile = async (content: string, suggestedName: string): Promise<FSFileHandle | null> => {
    if (!fsWindow.showSaveFilePicker) return null;
    try {
        const handle = await fsWindow.showSaveFilePicker({ suggestedName, types: MD_TYPES });
        await saveToHandle(handle, content);
        return handle;
    } catch {
        return null; // user cancelled
    }
};
