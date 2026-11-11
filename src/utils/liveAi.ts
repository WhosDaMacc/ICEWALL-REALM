// Live AI (DeepSeek) — the off-switch.
//
// Eddie's rule: no live AI until go-live. The toggle lives on the Profile
// page and is OFF by default. Every AI path in the app must go through
// this module, and while the toggle is OFF nothing here makes any network
// call — the navitar answers from its scripted lines, so no charges are
// possible.
//
// The DeepSeek key is NOT in this repo and must never be written into it.
// Eddie's key lives in his Secure Vault (custom.deepseek connector). For
// the toggle-on path only, the key is read from the build-time env var
// REACT_APP_DEEPSEEK_API_KEY (empty by default). A client-side key in a
// static site is visible to anyone who opens the site, so at real go-live
// a small backend proxy is the right call — not this round.
export const LIVE_AI_STORAGE_KEY = 'icewall-live-ai';
export const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
export const DEEPSEEK_MODEL = 'deepseek-chat';

export function isLiveAiEnabled(): boolean {
  try {
    return window.localStorage.getItem(LIVE_AI_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setLiveAiEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(LIVE_AI_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Storage unavailable (private mode, etc.) — the toggle just
    // doesn't persist, and Live AI stays off.
  }
}

// Build-time env var only. Empty in every build until someone bakes a key
// in at go-live build time — never paste a real key into the repo or a
// .env file.
export function getDeepSeekApiKey(): string {
  return (process.env.REACT_APP_DEEPSEEK_API_KEY as string | undefined) || '';
}

export type LiveAiStatus = 'off' | 'on-no-key' | 'ready';

export function liveAiStatus(): LiveAiStatus {
  if (!isLiveAiEnabled()) return 'off';
  return getDeepSeekApiKey() ? 'ready' : 'on-no-key';
}

export interface DeepSeekChatInput {
  navitarName: string;
  // Short character descriptor — the navitar's element ("ice") for the
  // chat box, or its personality string for the AR avatar.
  character: string;
  userMessage: string;
}

// The one and only DeepSeek call path. Gated twice: it returns null
// immediately when the toggle is OFF or no key is baked into the build,
// so no request is ever made in those states. On any failure (network,
// bad key, timeout) it also returns null — the caller falls back to a
// scripted line and says the AI is unavailable.
export async function askDeepSeek(input: DeepSeekChatInput): Promise<string | null> {
  if (liveAiStatus() !== 'ready') return null;
  const apiKey = getDeepSeekApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are ${input.navitarName}, a ${input.character} battle companion in the game ICEWALL-REALM. Answer in character, briefly (one or two sentences), as a loyal fighting companion. Never mention that you are an AI model.`,
          },
          { role: 'user', content: input.userMessage },
        ],
        max_tokens: 120,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    return typeof reply === 'string' && reply.trim() ? reply.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
