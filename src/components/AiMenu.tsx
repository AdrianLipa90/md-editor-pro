//src/components/AiMenu.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Settings2, Loader2 } from 'lucide-react';
import {
    AI_ACTIONS, loadAiSettings, saveAiSettings,
    type AiAction, type AiSettings
} from '../utils/ai';

interface AiMenuProps {
    busy: boolean;
    onRun: (action: AiAction, settings: AiSettings) => void;
}

const AiMenu: React.FC<AiMenuProps> = ({ busy, onRun }) => {
    const [open, setOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const runAction = (action: AiAction) => {
        setOpen(false);
        if (!settings.apiKey && settings.endpoint.includes('openrouter')) {
            setShowSettings(true);
            setOpen(true);
            return;
        }
        onRun(action, settings);
    };

    const updateSetting = (patch: Partial<AiSettings>) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        saveAiSettings(next);
    };

    const inputClass = 'w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-gray-900 dark:text-[#e6edf3] focus:outline-none focus:border-blue-500';

    return (
        <div ref={rootRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                disabled={busy}
                className={`p-2 rounded-lg transition-colors ${open ? 'bg-white/20' : 'hover:bg-white/10'} disabled:opacity-60`}
                title="AI assist (bring your own key)"
            >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-xl z-50 text-gray-900 dark:text-[#e6edf3]">
                    <div className="p-2 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between">
                        <span className="text-sm font-semibold px-1">AI Assist</span>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-[#21262d]"
                            title="AI settings"
                        >
                            <Settings2 size={15} />
                        </button>
                    </div>

                    {showSettings ? (
                        <div className="p-3 space-y-2">
                            <label className="block text-xs text-gray-500 dark:text-[#7d8590]">
                                Endpoint (OpenAI-compatible)
                                <input
                                    className={inputClass}
                                    value={settings.endpoint}
                                    onChange={(e) => updateSetting({ endpoint: e.target.value })}
                                    placeholder="https://openrouter.ai/api/v1"
                                />
                            </label>
                            <label className="block text-xs text-gray-500 dark:text-[#7d8590]">
                                API key (stored only in this browser)
                                <input
                                    className={inputClass}
                                    type="password"
                                    value={settings.apiKey}
                                    onChange={(e) => updateSetting({ apiKey: e.target.value })}
                                    placeholder="sk-or-..."
                                />
                            </label>
                            <label className="block text-xs text-gray-500 dark:text-[#7d8590]">
                                Model
                                <input
                                    className={inputClass}
                                    value={settings.model}
                                    onChange={(e) => updateSetting({ model: e.target.value })}
                                    placeholder="anthropic/claude-haiku-4.5"
                                />
                            </label>
                            <p className="text-[11px] text-gray-400 dark:text-[#6e7681] pt-1">
                                Works with OpenRouter, OpenAI, or a local Ollama server
                                (http://localhost:11434/v1, empty key).
                            </p>
                        </div>
                    ) : (
                        <div className="py-1">
                            {(Object.keys(AI_ACTIONS) as AiAction[]).map((action) => (
                                <button
                                    key={action}
                                    onClick={() => runAction(action)}
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-[#21262d]"
                                >
                                    {AI_ACTIONS[action].label}
                                    <span className="block text-[11px] text-gray-400 dark:text-[#6e7681]">
                                        {action === 'summarize' ? 'Appends a summary to the document'
                                            : action === 'continue' ? 'Writes on from the end'
                                                : 'Applies to selection, or whole document'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AiMenu;
