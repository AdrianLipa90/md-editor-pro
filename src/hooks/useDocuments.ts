//src/hooks/useDocuments.ts

import { useCallback, useEffect, useState } from 'react';

export interface Doc {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

const DOCS_KEY = 'md-editor-docs';
const ACTIVE_KEY = 'md-editor-active-doc';
const LEGACY_KEY = 'md-editor-content';

export const deriveTitle = (content: string): string => {
    for (const line of content.split('\n')) {
        const m = line.match(/^#{1,6}\s+(.+)/);
        if (m) {
            const t = m[1].replace(/[*_`~[\]]/g, '').trim();
            return t.length > 24 ? t.slice(0, 24) + '…' : t;
        }
    }
    const first = content.split('\n').find((l) => l.trim());
    if (first) {
        const t = first.trim();
        return t.length > 24 ? t.slice(0, 24) + '…' : t;
    }
    return 'Untitled';
};

const newId = () => crypto.randomUUID();

const loadDocs = (defaultContent: string): Doc[] => {
    try {
        const raw = localStorage.getItem(DOCS_KEY);
        if (raw) {
            const arr = JSON.parse(raw) as Doc[];
            if (Array.isArray(arr) && arr.length > 0) return arr;
        }
    } catch {
        // corrupted storage -> start fresh below
    }
    // Migrate the pre-tabs single-document storage
    const legacy = localStorage.getItem(LEGACY_KEY);
    const content = legacy ?? defaultContent;
    return [{ id: newId(), title: deriveTitle(content), content, updatedAt: Date.now() }];
};

export const useDocuments = (defaultContent: string) => {
    const [docs, setDocs] = useState<Doc[]>(() => loadDocs(defaultContent));
    const [activeId, setActiveId] = useState<string>(() => {
        const stored = localStorage.getItem(ACTIVE_KEY);
        return stored ?? '';
    });

    // Ensure activeId always points at an existing doc
    const active = docs.find((d) => d.id === activeId) ?? docs[0];

    // Persist (debounced) whenever docs change
    useEffect(() => {
        const t = setTimeout(() => {
            localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
        }, 400);
        return () => clearTimeout(t);
    }, [docs]);

    useEffect(() => {
        localStorage.setItem(ACTIVE_KEY, active.id);
    }, [active.id]);

    const activeDocId = active.id;
    const setContent = useCallback((content: string) => {
        setDocs((prev) => prev.map((d) =>
            d.id === activeDocId
                ? { ...d, content, title: deriveTitle(content), updatedAt: Date.now() }
                : d
        ));
    }, [activeDocId]);

    const createDoc = useCallback((content = '', title?: string): string => {
        const id = newId();
        const doc: Doc = {
            id,
            title: title ?? (content ? deriveTitle(content) : 'Untitled'),
            content,
            updatedAt: Date.now(),
        };
        setDocs((prev) => [...prev, doc]);
        setActiveId(id);
        return id;
    }, []);

    const switchDoc = useCallback((id: string) => {
        setActiveId(id);
    }, []);

    const closeDoc = useCallback((id: string) => {
        setDocs((prev) => {
            if (prev.length === 1) {
                // Never leave zero docs: closing the last one resets it
                const doc: Doc = { id: newId(), title: 'Untitled', content: '', updatedAt: Date.now() };
                setActiveId(doc.id);
                return [doc];
            }
            const idx = prev.findIndex((d) => d.id === id);
            const next = prev.filter((d) => d.id !== id);
            setActiveId((cur) => (cur === id ? next[Math.max(0, idx - 1)].id : cur));
            return next;
        });
    }, []);

    return { docs, active, setContent, createDoc, switchDoc, closeDoc };
};
