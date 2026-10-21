// AI provider registry + pure response parsing. The HTTP adapters live in
// ai.service; everything here is pure and unit-tested.

export type AiProviderId = 'anthropic' | 'openai' | 'google';

export interface AiModel {
  id: string;
  label: string;
}
export interface AiProvider {
  id: AiProviderId;
  label: string;
  /** Default model used when none is chosen. */
  defaultModel: string;
  /** Suggested models; the UI also allows a custom id. */
  models: AiModel[];
}

export const AI_PROVIDERS: AiProvider[] = [
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    defaultModel: 'claude-opus-5-5',
    models: [
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
    ],
  },
  {
    id: 'openai',
    label: 'ChatGPT (OpenAI)',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
    ],
  },
  {
    id: 'google',
    label: 'Gemini (Google)',
    defaultModel: 'gemini-1.5-pro',
    models: [
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    ],
  },
];

export function isProviderId(v: unknown): v is AiProviderId {
  return v === 'anthropic' || v === 'openai' || v === 'google';
}

export function getProvider(id: AiProviderId): AiProvider {
  const p = AI_PROVIDERS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown AI provider: ${id}`);
  return p;
}

export interface GeneratedTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Models are asked to return a JSON object. They often wrap it in prose or a
 * ```json fence, so pull the first balanced object out and validate its shape.
 */
export function extractTemplate(raw: string): GeneratedTemplate {
  const obj = parseFirstJsonObject(raw);
  if (!obj || typeof obj !== 'object') throw new Error('AI did not return a JSON object');
  const o = obj as Record<string, unknown>;
  const subject = typeof o.subject === 'string' ? o.subject : '';
  const html = typeof o.html === 'string' ? o.html : '';
  const text = typeof o.text === 'string' ? o.text : '';
  if (!subject && !html) throw new Error('AI response had no subject or html');
  return { subject, html, text };
}

function parseFirstJsonObject(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]! : raw;
  const start = candidate.indexOf('{');
  if (start === -1) return undefined;
  // Walk to the matching close brace, respecting strings and escapes.
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(candidate.slice(start, i + 1)); } catch { return undefined; }
      }
    }
  }
  return undefined;
}
