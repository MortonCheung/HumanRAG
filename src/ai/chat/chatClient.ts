import type { ChatRequest, ChatResult } from './contracts';
import { buildMockReply } from './mockReplies';

export async function sendChat(request: ChatRequest, signal?: AbortSignal): Promise<ChatResult> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.includes('application/json')) throw new Error('AI_GATEWAY_UNAVAILABLE');
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || typeof (body as { text?: unknown }).text !== 'string') throw new Error('INVALID_AI_RESPONSE');
    return { text: (body as { text: string }).text, source: 'live' };
  } catch {
    return buildMockReply(request);
  }
}
