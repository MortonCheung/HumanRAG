interface Env { MIMO_API_KEY: string }
interface FunctionContext { request: Request; env: Env }

const MIMO_API_URL = 'https://api.xiaomimimo.com/v1/chat/completions';
const MIMO_TTS_MODEL = 'mimo-v2.5-tts';
const MIMO_TTS_VOICE = '苏打';
const MAX_TEXT_LENGTH = 2_000;

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

export async function onRequestPost(context: FunctionContext) {
  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const text = payload && typeof payload === 'object' && typeof (payload as { text?: unknown }).text === 'string'
    ? (payload as { text: string }).text.trim()
    : '';
  if (!text) return json({ error: 'INVALID_TEXT' }, 400);
  if (text.length > MAX_TEXT_LENGTH) return json({ error: 'TEXT_TOO_LONG' }, 413);
  if (!context.env.MIMO_API_KEY) return json({ error: 'TTS_NOT_CONFIGURED' }, 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(MIMO_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${context.env.MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_TTS_MODEL,
        messages: [{ role: 'assistant', content: text }],
        audio: { format: 'wav', voice: MIMO_TTS_VOICE },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: 'TTS_PROVIDER_ERROR' }, 502);

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return json({ error: 'EMPTY_AUDIO' }, 502);
    }
    const base64 = data && typeof data === 'object'
      ? (data as { choices?: Array<{ message?: { audio?: { data?: unknown } } }> }).choices?.[0]?.message?.audio?.data
      : undefined;
    if (typeof base64 !== 'string' || !base64.trim()) return json({ error: 'EMPTY_AUDIO' }, 502);

    let bytes: Uint8Array;
    try {
      const binary = atob(base64);
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    } catch {
      return json({ error: 'EMPTY_AUDIO' }, 502);
    }
    return new Response(bytes, {
      status: 200,
      headers: { 'content-type': 'audio/wav', 'cache-control': 'no-store' },
    });
  } catch {
    return json({ error: controller.signal.aborted ? 'TTS_TIMEOUT' : 'TTS_UNAVAILABLE' }, 503);
  } finally {
    clearTimeout(timeout);
  }
}
