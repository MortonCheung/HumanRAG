// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** speechClient 持有模块级 audio 单例，每个用例都重新加载模块以隔离状态。 */
async function loadClient() {
  vi.resetModules();
  return import('./speechClient');
}

function stubAudio(play: ReturnType<typeof vi.fn>, pause: ReturnType<typeof vi.fn>) {
  class AudioStub {
    src = '';
    currentTime = 5;
    onended: (() => void) | null = null;
    play = play;
    pause = pause;
  }
  vi.stubGlobal('Audio', AudioStub);
}

function stubSuccessfulSpeech() {
  // 每次调用都要返回新的 Response：并发朗读时同一个 body 只能读一次。
  return vi.fn().mockImplementation(() => Promise.resolve(
    new Response(new Blob(['wav']), { status: 200, headers: { 'content-type': 'audio/wav' } }),
  ));
}

describe('speechClient', () => {
  it('把文本发送给共享语音端点并自动播放 WAV', async () => {
    const { speakText } = await loadClient();
    const fetchSpy = stubSuccessfulSpeech();
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    stubAudio(play, pause);
    const createObjectURL = vi.fn().mockReturnValue('blob:test-audio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    await speakText('  这是回答。  ');

    expect(fetchSpy).toHaveBeenCalledWith('/api/speech', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: '这是回答。' }),
    }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledOnce();
  });

  it('连续朗读时不叠加音频，只有最新一段会播放', async () => {
    const { speakText } = await loadClient();
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    stubAudio(play, pause);
    vi.stubGlobal('fetch', stubSuccessfulSpeech());
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:test-audio'), revokeObjectURL: vi.fn() });

    await Promise.all([speakText('第一段。'), speakText('第二段。')]);

    expect(play).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenCalled();
  });

  it('stopSpeech 暂停当前音频并释放 object URL', async () => {
    const { speakText, stopSpeech } = await loadClient();
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    stubAudio(play, pause);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('fetch', stubSuccessfulSpeech());
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:test-audio'), revokeObjectURL });

    await speakText('这是回答。');
    stopSpeech();

    expect(pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-audio');
  });

  it('停止后在途的语音请求不会再播放', async () => {
    const { speakText, stopSpeech } = await loadClient();
    let releaseFetch!: (value: Response) => void;
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    stubAudio(play, pause);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((done) => { releaseFetch = done; })));
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:test-audio'), revokeObjectURL: vi.fn() });

    const pending = speakText('这是回答。');
    stopSpeech();
    releaseFetch(new Response(new Blob(['wav']), { status: 200 }));
    await pending;

    expect(play).not.toHaveBeenCalled();
  });
});
