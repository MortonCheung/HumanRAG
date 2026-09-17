let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
// 每次开始朗读或主动停止都会推进 generation，只有最新一段语音允许播放，
// 这样连续发送时旧音频不会和新音频叠加，开关关闭也能让在途请求静音。
let generation = 0;

function release(url: string) {
  URL.revokeObjectURL(url);
  if (objectUrl === url) objectUrl = null;
}

function reset(): void {
  if (!audio) return;
  audio.pause();
  audio.onended = null;
  if (audio.currentTime) audio.currentTime = 0;
  const url = objectUrl;
  objectUrl = null;
  if (url) release(url);
}

/** 停止当前语音并丢弃在途请求，用于关闭自动朗读或离开页面。 */
export function stopSpeech(): void {
  generation += 1;
  reset();
}

export async function speakText(raw: string): Promise<void> {
  const text = raw.trim();
  if (!text) return;

  const token = ++generation;
  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('TTS_GATEWAY_UNAVAILABLE');

  const nextUrl = URL.createObjectURL(await response.blob());
  if (token !== generation) {
    URL.revokeObjectURL(nextUrl);
    return;
  }
  audio ??= new Audio();
  reset();
  objectUrl = nextUrl;
  audio.src = nextUrl;
  audio.onended = () => release(nextUrl);
  try {
    await audio.play();
  } catch (error) {
    release(nextUrl);
    throw error;
  }
}
