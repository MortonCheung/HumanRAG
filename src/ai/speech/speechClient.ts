let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;

function release(url: string) {
  URL.revokeObjectURL(url);
  if (objectUrl === url) objectUrl = null;
}

export async function speakText(raw: string): Promise<void> {
  const text = raw.trim();
  if (!text) return;

  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error('TTS_GATEWAY_UNAVAILABLE');

  const nextUrl = URL.createObjectURL(await response.blob());
  audio ??= new Audio();
  if (objectUrl) {
    audio.pause();
    audio.currentTime = 0;
    release(objectUrl);
  }
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
