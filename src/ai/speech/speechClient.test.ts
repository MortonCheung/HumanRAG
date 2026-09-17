// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakText } from './speechClient';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('speechClient', () => {
  it('把文本发送给共享语音端点并自动播放 WAV', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(new Blob(['wav']), { status: 200, headers: { 'content-type': 'audio/wav' } }));
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    class AudioStub {
      src = '';
      currentTime = 0;
      onended: (() => void) | null = null;
      play = play;
      pause = pause;
    }
    const createObjectURL = vi.fn().mockReturnValue('blob:test-audio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('Audio', AudioStub);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    await speakText('  这是回答。  ');

    expect(fetchSpy).toHaveBeenCalledWith('/api/speech', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ text: '这是回答。' }),
    }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledOnce();
  });
});
