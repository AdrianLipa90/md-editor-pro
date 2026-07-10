//src/utils/ai.ts

// Bring-your-own-key AI assist: talks to any OpenAI-compatible endpoint
// (OpenRouter, OpenAI, local Ollama, ...). The key never leaves the browser
// except to the endpoint the user configured.

export interface AiSettings {
    endpoint: string;
    apiKey: string;
    model: string;
}

const AI_KEY = 'md-editor-ai';

export const DEFAULT_AI_SETTINGS: AiSettings = {
    endpoint: 'https://openrouter.ai/api/v1',
    apiKey: '',
    model: 'anthropic/claude-haiku-4.5',
};

export const loadAiSettings = (): AiSettings => {
    try {
        const raw = localStorage.getItem(AI_KEY);
        if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
    } catch {
        // fall through to defaults
    }
    return { ...DEFAULT_AI_SETTINGS };
};

export const saveAiSettings = (settings: AiSettings): void => {
    localStorage.setItem(AI_KEY, JSON.stringify(settings));
};

export type AiAction = 'improve' | 'grammar' | 'summarize' | 'continue';

export const AI_ACTIONS: Record<AiAction, { label: string; system: string }> = {
    improve: {
        label: 'Improve writing',
        system: 'You are a writing assistant. Rewrite the given markdown to be clearer and more engaging while keeping the meaning, structure, markdown formatting, and language. Reply with ONLY the rewritten markdown, no preamble.',
    },
    grammar: {
        label: 'Fix grammar & spelling',
        system: 'You are a proofreader. Fix grammar, spelling and punctuation in the given markdown without changing its meaning, tone, structure or markdown formatting. Reply with ONLY the corrected markdown, no preamble.',
    },
    summarize: {
        label: 'Summarize',
        system: 'You are a summarizer. Produce a concise markdown summary (bullet points where natural) of the given markdown document. Reply with ONLY the summary in markdown, no preamble.',
    },
    continue: {
        label: 'Continue writing',
        system: 'You are a co-writer. Continue the given markdown document naturally from where it ends, matching its tone, style and formatting. Reply with ONLY the continuation in markdown, no preamble.',
    },
};

export const runAiCompletion = async (
    settings: AiSettings,
    action: AiAction,
    text: string
): Promise<string> => {
    const base = settings.endpoint.replace(/\/+$/, '');
    const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [
                { role: 'system', content: AI_ACTIONS[action].system },
                { role: 'user', content: text },
            ],
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
        throw new Error('AI returned an empty response');
    }
    return content.trim();
};
