import type { RefactorResult, RefactorSegment } from '../types';

// ── Backend API ───────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface AuthUser { id: string; email: string; username: string; }

export interface ApiVersion {
  id: string; promptId: string; content: string;
  imageUrl: string | null; versionName: string; createdAt: string;
}

export interface ApiPrompt {
  id: string; userId: string; title: string; content: string;
  imageUrl: string | null; tags: string[]; isPublic: boolean;
  currentVersionId: string | null; currentVersion: ApiVersion | null;
  createdAt: string; updatedAt: string;
}

export interface ApiSaved {
  id: string; userId: string; promptId: string; createdAt: string;
  prompt: ApiPrompt;
}

export function getToken(): string | null { return localStorage.getItem('auth_token'); }
function setToken(t: string) { localStorage.setItem('auth_token', t); }
export function clearToken() { localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user'); }
export function getStoredUser(): AuthUser | null {
  const r = localStorage.getItem('auth_user'); return r ? JSON.parse(r) : null;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data as T;
}

export async function apiLogin(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  setToken(res.token);
  localStorage.setItem('auth_user', JSON.stringify(res.user));
  return res.user;
}

export async function apiRegister(email: string, password: string, username?: string): Promise<AuthUser> {
  const res = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, username: username || email.split('@')[0] }),
  });
  setToken(res.token);
  localStorage.setItem('auth_user', JSON.stringify(res.user));
  return res.user;
}

export function apiLogout() { clearToken(); }

export async function fetchPrompts(): Promise<ApiPrompt[]> { return apiFetch<ApiPrompt[]>('/api/prompts'); }
export async function fetchPromptById(id: string): Promise<ApiPrompt> { return apiFetch<ApiPrompt>(`/api/prompts/${id}`); }
export async function fetchVersionsForPrompt(promptId: string): Promise<ApiVersion[]> { return apiFetch<ApiVersion[]>(`/api/prompts/${promptId}/versions`); }
export async function createPromptWithVersion(title: string, content: string, imageUrl?: string, tags?: string[]): Promise<ApiPrompt> {
  return apiFetch<ApiPrompt>('/api/prompts', { method: 'POST', body: JSON.stringify({ title, content, imageUrl, tags: tags ?? [] }) });
}
export async function createVersion(promptId: string, content: string, versionName: string, imageUrl?: string): Promise<ApiVersion> {
  return apiFetch<ApiVersion>(`/api/prompts/${promptId}/versions`, { method: 'POST', body: JSON.stringify({ content, versionName, imageUrl }) });
}
export async function fetchSavedPrompts(): Promise<ApiSaved[]> { return apiFetch<ApiSaved[]>('/api/prompts/saved/list'); }
export async function toggleSavePrompt(promptId: string): Promise<{ saved: boolean }> {
  return apiFetch<{ saved: boolean }>(`/api/prompts/${promptId}/save`, { method: 'POST' });
}

// OpenRouter — primary LLM provider (free tier available)
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
// HuggingFace Inference Providers router — fallback LLM
const HF_CHAT_URL = 'https://router.huggingface.co/v1/chat/completions';
// HuggingFace image generation (unchanged)
const HF_BASE = 'https://router.huggingface.co/hf-inference/models';

// HuggingFace fallback models (credits often depleted)
const HF_CHAT_MODELS = [
  'meta-llama/Llama-3.1-8B-Instruct', // Cerebras — fastest
  'Qwen/Qwen3-Coder-Next',             // solid JSON output
  'deepseek-ai/DeepSeek-V3.2',         // good quality, wraps in ```json (parser handles it)
];

const SYSTEM_PROMPT = `You are a prompt engineering expert. The user gives you an image generation prompt.
Pick 3 short phrases from it and suggest 3 alternatives for each.

Reply ONLY with this exact JSON format:
{"segments":[{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]},{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]},{"original":"phrase from prompt","alternatives":["alt1","alt2","alt3"]}]}

Rules:
- No explanation, no markdown, no thinking, ONLY the JSON object
- "original" must be an exact substring from the user's prompt
- Exactly 3 segments, exactly 3 alternatives each`;

function parseRawSegments(raw: string): Array<{ original: string; alternatives: string[] }> {
  let text = raw;
  text = text.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?(<\/reasoning>|$)/gi, '');
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  const startIdx = text.indexOf('{');
  if (startIdx === -1) throw new Error('No JSON found in LLM response.');

  let depth = 0, inStr = false, esc = false, endIdx = -1;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  if (endIdx === -1) throw new Error('Unbalanced JSON in LLM response.');

  const parsed = JSON.parse(text.slice(startIdx, endIdx + 1)) as Record<string, unknown>;

  // Format 1: {"segments": [...]}
  if (Array.isArray(parsed.segments)) {
    return (parsed.segments as Array<{ original: string; alternatives: string[] }>)
      .slice(0, 3)
      .map((s) => ({
        original: s.original,
        alternatives: Array.isArray(s.alternatives) ? s.alternatives.slice(0, 3) : [],
      }));
  }

  // Format 2 (flat map): {"phrase": ["alt1","alt2","alt3"]}
  const segments: Array<{ original: string; alternatives: string[] }> = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      segments.push({ original: key, alternatives: (value as string[]).slice(0, 3) });
    }
    if (segments.length >= 3) break;
  }
  if (segments.length > 0) return segments;

  throw new Error('Could not extract segments from LLM response.');
}

function toRefactorSegments(
  raw: Array<{ original: string; alternatives: string[] }>,
  prompt: string
): RefactorSegment[] {
  const result: RefactorSegment[] = [];
  for (const s of raw) {
    const startIndex = prompt.indexOf(s.original);
    if (startIndex === -1) continue;
    result.push({
      id: crypto.randomUUID() as string,
      original: s.original,
      startIndex,
      endIndex: startIndex + s.original.length,
      reason: '',
      alternatives: s.alternatives.map((text) => ({ id: crypto.randomUUID() as string, text })),
    });
  }
  return result;
}

async function callOpenRouterChat(promptText: string, model: string, apiKey: string): Promise<string> {
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    let msg = `OpenRouter ${res.status}`;
    try { msg = (JSON.parse(t) as { error?: { message?: string } }).error?.message ?? msg; } catch { /* keep */ }
    throw new Error(msg);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content?: string; reasoning?: string } }>;
  };
  const msg = data.choices?.[0]?.message;
  return msg?.content || msg?.reasoning || '';
}

async function callHfChat(promptText: string, model: string, token: string): Promise<string> {
  const res = await fetch(HF_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) {
    const t = await res.text();
    let msg = `HF ${res.status}`;
    try { msg = (JSON.parse(t) as { error?: { message?: string } | string }).error
      ? typeof (JSON.parse(t) as { error: { message?: string } | string }).error === 'string'
        ? (JSON.parse(t) as { error: string }).error
        : ((JSON.parse(t) as { error: { message?: string } }).error?.message ?? msg)
      : msg;
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content?: string; reasoning?: string } }>;
  };
  const msg = data.choices?.[0]?.message;
  // Some models put output in `reasoning` when content is empty
  return msg?.content || msg?.reasoning || '';
}

export async function refactorPrompt(prompt: string): Promise<RefactorResult> {
  // Try OpenRouter first (more reliable, free tier available)
  const openRouterKey = import.meta.env.VITE_OPENROUTER_KEY;
  const openRouterModel = import.meta.env.VITE_CHAT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';

  if (openRouterKey) {
    try {
      const rawContent = await callOpenRouterChat(prompt, openRouterModel, openRouterKey);
      const rawSegments = parseRawSegments(rawContent);
      const segments = toRefactorSegments(rawSegments, prompt);
      if (segments.length > 0) return { originalPrompt: prompt, segments };
    } catch {
      // Fall through to HuggingFace
    }
  }

  // Fallback: HuggingFace
  const token = import.meta.env.VITE_HF_TOKEN;
  if (!token) throw new Error('VITE_HF_TOKEN is not set');

  let lastError: Error = new Error('Refactor failed');

  for (const model of HF_CHAT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rawContent = await callHfChat(prompt, model, token);
        const rawSegments = parseRawSegments(rawContent);
        const segments = toRefactorSegments(rawSegments, prompt);
        if (segments.length === 0) throw new Error('No valid segments found.');
        return { originalPrompt: prompt, segments };
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Failed');
        if (e.message === 'RATE_LIMIT') {
          lastError = new Error(`${model.split('/')[1]} rate limited, trying next...`);
          break; // skip to next model
        }
        lastError = e;
        if (attempt === 0) continue; // retry once on parse errors
      }
    }
  }

  throw lastError;
}

export async function generateImage(
  prompt: string
): Promise<{ imageUrl: string; imageBlob: Blob }> {
  const token = import.meta.env.VITE_HF_TOKEN;
  const model = import.meta.env.VITE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';
  if (!token) throw new Error('VITE_HF_TOKEN is not set');

  const res = await fetch(`${HF_BASE}/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!res.ok) {
    const errText = await res.text();
    let msg = `Image generation failed (${res.status})`;
    try {
      const p = JSON.parse(errText) as { error?: string };
      if (p.error) msg = p.error;
    } catch { /* use default */ }
    throw new Error(msg);
  }

  const imageBlob = await res.blob();

  // Upload to imgbb for permanent URL
  const imgbbKey = import.meta.env.VITE_IMGBB_KEY;
  if (imgbbKey) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
    const form = new FormData();
    form.append('key', imgbbKey);
    form.append('image', base64);
    const uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json() as { data: { url: string } };
      return { imageUrl: uploadData.data.url, imageBlob };
    }
  }

  // Fallback: blob URL (temporary)
  return { imageUrl: URL.createObjectURL(imageBlob), imageBlob };
}
