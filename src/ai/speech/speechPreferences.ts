import { useSyncExternalStore } from 'react';
import { stopSpeech } from './speechClient';

const TTS_ENABLED_KEY = 'humanrag:tts-enabled';

/** 自动朗读默认关闭；开启后真实 AI 回答才会调用语音端点。 */
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return localStorage.getItem(TTS_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

let enabled = readStored();

export function isSpeechEnabled(): boolean {
  return enabled;
}

/** Pico 与 AI导师共用同一个开关。关闭时立即停止正在播放的语音。 */
export function setSpeechEnabled(next: boolean): void {
  const value = next === true;
  try {
    localStorage.setItem(TTS_ENABLED_KEY, String(value));
  } catch {
    // 隐私模式下写入失败时仍保留本次会话的状态。
  }
  if (value === enabled) return;
  enabled = value;
  if (!value) stopSpeech();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useSpeechEnabled(): boolean {
  return useSyncExternalStore(subscribe, isSpeechEnabled);
}
