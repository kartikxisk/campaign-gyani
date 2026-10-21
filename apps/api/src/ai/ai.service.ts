import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env';
import { encryptSecret, decryptSecret } from '../auth/crypto.util';
import {
  AI_PROVIDERS,
  getProvider,
  isProviderId,
  extractTemplate,
  type AiProviderId,
  type AiProvider,
  type GeneratedTemplate,
} from './ai.providers';

const AI_ROW = 'ai';
const TIMEOUT_MS = 45_000;

interface StoredAiConfig {
  provider: AiProviderId;
  model: string;
  keyEnc?: string;
}
export interface PublicAiConfig {
  provider: AiProviderId;
  model: string;
  hasKey: boolean;
  providers: AiProvider[];
}
export interface UpdateAiConfig {
  provider?: AiProviderId;
  model?: string;
  apiKey?: string;
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Pick<Env, 'SMTP_ENC_KEY'>,
  ) {}

  private async stored(): Promise<StoredAiConfig> {
    const row = await this.prisma.appSetting.findUnique({ where: { id: AI_ROW } });
    const c = (row?.config as Partial<StoredAiConfig> | null) ?? {};
    const provider = isProviderId(c.provider) ? c.provider : 'anthropic';
    const model = typeof c.model === 'string' && c.model ? c.model : getProvider(provider).defaultModel;
    return { provider, model, keyEnc: typeof c.keyEnc === 'string' ? c.keyEnc : undefined };
  }

  async getConfig(): Promise<PublicAiConfig> {
    const s = await this.stored();
    return { provider: s.provider, model: s.model, hasKey: Boolean(s.keyEnc), providers: AI_PROVIDERS };
  }

  async updateConfig(patch: UpdateAiConfig): Promise<PublicAiConfig> {
    const current = await this.stored();
    const provider = patch.provider ?? current.provider;
    if (!isProviderId(provider)) throw new BadRequestException('Unknown AI provider');
    // A provider switch with no model falls back to that provider's default.
    const model = patch.model?.trim() || (patch.provider && patch.provider !== current.provider ? getProvider(provider).defaultModel : current.model);
    const next: StoredAiConfig = { provider, model, keyEnc: current.keyEnc };
    if (patch.apiKey && patch.apiKey.trim()) next.keyEnc = encryptSecret(patch.apiKey.trim(), this.env.SMTP_ENC_KEY);
    await this.prisma.appSetting.upsert({
      where: { id: AI_ROW },
      create: { id: AI_ROW, config: next as object },
      update: { config: next as object },
    });
    return { provider: next.provider, model: next.model, hasKey: Boolean(next.keyEnc), providers: AI_PROVIDERS };
  }

  private async resolveKey(): Promise<{ provider: AiProviderId; model: string; apiKey: string }> {
    const s = await this.stored();
    if (!s.keyEnc) throw new BadRequestException('No AI API key configured. Add one in Settings.');
    return { provider: s.provider, model: s.model, apiKey: decryptSecret(s.keyEnc, this.env.SMTP_ENC_KEY) };
  }

  /** Validate the stored key by asking the model for a one-word reply. */
  async test(): Promise<{ ok: true; provider: AiProviderId; model: string }> {
    const { provider, model, apiKey } = await this.resolveKey();
    await this.complete(provider, model, apiKey, 'Reply with the single word: ok', 'You are a terse assistant.', 16);
    return { ok: true, provider, model };
  }

  async generateTemplate(prompt: string, context?: string): Promise<GeneratedTemplate> {
    const { provider, model, apiKey } = await this.resolveKey();
    const system = [
      'You write realistic phishing-simulation and marketing email templates for an authorized security-awareness platform.',
      'Return ONLY a JSON object with keys "subject" (string), "html" (string, inline-safe HTML body), and "text" (string, plain-text alternative).',
      'You may use these merge tokens where natural: {{.FirstName}} {{.LastName}} {{.Email}} {{.Position}} {{.URL}} {{.UnsubscribeURL}}.',
      'Do not include <html>/<head>/<body> wrappers — just the body markup. No commentary outside the JSON.',
    ].join(' ');
    const user = context?.trim() ? `${prompt}\n\nContext about the organization/target:\n${context.trim()}` : prompt;
    const raw = await this.complete(provider, model, apiKey, user, system, 4000);
    return extractTemplate(raw);
  }

  // ---- provider HTTP adapters (raw fetch, correct per-provider shapes) ----

  private async complete(provider: AiProviderId, model: string, apiKey: string, user: string, system: string, maxTokens: number): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      if (provider === 'anthropic') return await this.anthropic(model, apiKey, user, system, maxTokens, ctrl.signal);
      if (provider === 'openai') return await this.openai(model, apiKey, user, system, maxTokens, ctrl.signal);
      return await this.google(model, apiKey, user, system, maxTokens, ctrl.signal);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const msg = (e as Error).name === 'AbortError' ? 'The AI provider timed out' : (e as Error).message;
      throw new BadRequestException(`AI request failed: ${msg}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async anthropic(model: string, apiKey: string, user: string, system: string, maxTokens: number, signal: AbortSignal): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    const data = await this.json(res, 'Anthropic');
    const blocks = (data.content ?? []) as Array<{ type: string; text?: string }>;
    return blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  }

  private async openai(model: string, apiKey: string, user: string, system: string, maxTokens: number, signal: AbortSignal): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    });
    const data = await this.json(res, 'OpenAI');
    return (data.choices?.[0]?.message?.content as string | undefined) ?? '';
  }

  private async google(model: string, apiKey: string, user: string, system: string, maxTokens: number, signal: AbortSignal): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    const data = await this.json(res, 'Gemini');
    const parts = (data.candidates?.[0]?.content?.parts ?? []) as Array<{ text?: string }>;
    return parts.map((p) => p.text ?? '').join('');
  }

  private async json(res: Response, name: string): Promise<any> {
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Surface the provider's message but never echo request contents.
      const detail = body.slice(0, 200).replace(/\s+/g, ' ').trim();
      throw new BadRequestException(`${name} API error ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return res.json();
  }
}
