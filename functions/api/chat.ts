import { AI_BUDGETS } from '../../src/ai/chat/contracts';
import { buildProviderMessages } from '../../src/ai/chat/providerMessages';
import { validateChatRequest } from '../../src/ai/chat/validation';

interface Env { AI_API_URL: string; AI_API_KEY: string; AI_MODEL: string }
interface FunctionContext { request: Request; env: Env }

const MAX_BODY_BYTES = 24 * 1024;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

/** 只暴露连接状态；密钥与完整 URL（含 query）绝不回传。GET 不调用模型、不消耗 token。 */
export async function onRequestGet(context: FunctionContext) {
  const { AI_API_URL: apiUrl, AI_API_KEY: apiKey, AI_MODEL: model } = context.env;
  if (!apiUrl || !apiKey || !model) return json({ configured: false, mode: 'mock' });
  let provider: string | undefined;
  try {
    provider = new URL(apiUrl).host;
  } catch {
    provider = undefined;
  }
  return json({ configured: true, mode: 'live', model, provider });
}

export async function onRequestPost(context: FunctionContext) {
  const declaredLength = Number(context.request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: 'REQUEST_TOO_LARGE' }, 413);
  const raw = await context.request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'REQUEST_TOO_LARGE' }, 413);

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }
  const validated = validateChatRequest(payload);
  if (!validated.ok) return json({ error: validated.error }, 400);
  if (!context.env.AI_API_URL || !context.env.AI_API_KEY || !context.env.AI_MODEL) return json({ error: 'AI_NOT_CONFIGURED' }, 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(context.env.AI_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${context.env.AI_API_KEY}` },
      body: JSON.stringify({
        model: context.env.AI_MODEL,
        messages: buildProviderMessages(validated.value),
        temperature: validated.value.mode === 'insight' ? 0.35 : 0.55,
        max_tokens: AI_BUDGETS[validated.value.mode].outputTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: 'PROVIDER_ERROR' }, 502);
    const data: unknown = await response.json();
    const text = data && typeof data === 'object'
      ? (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
      : undefined;
    if (typeof text !== 'string' || !text.trim()) return json({ error: 'EMPTY_RESPONSE' }, 502);
    return json({ text: text.trim().slice(0, 5_000), source: 'live' });
  } catch {
    return json({ error: controller.signal.aborted ? 'TIMEOUT' : 'PROVIDER_UNAVAILABLE' }, 503);
  } finally {
    clearTimeout(timeout);
  }
}
