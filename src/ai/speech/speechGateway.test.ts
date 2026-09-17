import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from '../../../functions/api/speech';

const env = { MIMO_API_KEY: 'secret' };
const context = (body: string, overrides: Partial<typeof env> = {}) => ({
  request: new Request('https://app.example/api/speech', { method: 'POST', body }),
  env: { ...env, ...overrides },
});

afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare speech gateway', () => {
  it('拒绝空文本、超长文本与缺少密钥的请求', async () => {
    expect((await onRequestPost(context('{'))).status).toBe(400);
    expect((await onRequestPost(context(JSON.stringify({ text: '   ' })))).status).toBe(400);
    expect((await onRequestPost(context(JSON.stringify({ text: '字'.repeat(2_001) })))).status).toBe(413);
    expect((await onRequestPost(context(JSON.stringify({ text: '你好' }), { MIMO_API_KEY: '' }))).status).toBe(503);
  });

  it('上游没有返回音频时给出 EMPTY_AUDIO', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: {} }] }), { status: 200 })));
    const response = await onRequestPost(context(JSON.stringify({ text: '你好' })));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'EMPTY_AUDIO' });
  });

  it('按官方请求格式调用 MiMo 并返回解码后的 WAV', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { audio: { data: btoa('RIFF') } } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    const response = await onRequestPost(context(JSON.stringify({ text: '  你好  ' })));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(new TextDecoder().decode(await response.arrayBuffer())).toBe('RIFF');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.xiaomimimo.com/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret');
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'mimo-v2.5-tts',
      messages: [{ role: 'assistant', content: '你好' }],
      audio: { format: 'wav', voice: '苏打' },
    });
  });
});
