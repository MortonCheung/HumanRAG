import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../../functions/api/chat';

const env = { AI_API_URL: 'https://provider.example/v1/chat/completions', AI_API_KEY: 'secret', AI_MODEL: 'model' };
const insight = {
  mode: 'insight',
  baseContext: {
    dataMode: 'demo', profile: { name: '小林', major: '软件工程', identity: '大四', goal: '复试' },
    overall: { accuracy: null, answered: 0, activeDays: 0, longestStreak: 0, touchedPoints: 0, openMisconceptions: 0 }, weakPoints: [],
  },
  contextBlocks: [],
};

function context(body: string, overrides: Partial<typeof env> = {}) {
  return { request: new Request('https://app.example/api/chat', { method: 'POST', body }), env: { ...env, ...overrides } };
}

afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare chat gateway', () => {
  it('拒绝无效 JSON 与超过 24KB 的 UTF-8 请求', async () => {
    expect((await onRequestPost(context('{'))).status).toBe(400);
    expect((await onRequestPost(context(JSON.stringify({ value: '你'.repeat(9_000) })))).status).toBe(413);
  });

  it('环境变量不完整时不请求 Provider', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const response = await onRequestPost(context(JSON.stringify(insight), { AI_API_KEY: '' }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AI_NOT_CONFIGURED' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('只把服务端构造的 Prompt、模型与预算发送给 Provider', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: '保持短时高频复习。' } }] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchSpy);
    const response = await onRequestPost(context(JSON.stringify(insight)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: '保持短时高频复习。', source: 'live' });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(env.AI_API_URL);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
    const providerBody = JSON.parse(String(init.body));
    expect(providerBody).toMatchObject({ model: 'model', max_tokens: 260, stream: false });
    expect(providerBody.messages[0].role).toBe('system');
  });
});
