// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stopSpeech } from './speechClient';
import { isSpeechEnabled, setSpeechEnabled } from './speechPreferences';

vi.mock('./speechClient', () => ({ stopSpeech: vi.fn() }));

describe('speechPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    setSpeechEnabled(false);
    vi.clearAllMocks();
  });

  it('默认关闭自动朗读', () => {
    expect(isSpeechEnabled()).toBe(false);
  });

  it('开启后写入 localStorage，刷新读取保持一致', () => {
    setSpeechEnabled(true);
    expect(isSpeechEnabled()).toBe(true);
    expect(localStorage.getItem('humanrag:tts-enabled')).toBe('true');
  });

  it('开启时不打断语音，关闭时立即停止当前语音', () => {
    setSpeechEnabled(true);
    expect(stopSpeech).not.toHaveBeenCalled();
    setSpeechEnabled(false);
    expect(stopSpeech).toHaveBeenCalledOnce();
    expect(isSpeechEnabled()).toBe(false);
  });
});
