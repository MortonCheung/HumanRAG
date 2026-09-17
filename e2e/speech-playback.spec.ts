import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

function silentWav() {
  const sampleCount = 1_600;
  const buffer = Buffer.alloc(44 + sampleCount, 128);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + sampleCount, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16_000, 24);
  buffer.writeUInt32LE(16_000, 28);
  buffer.writeUInt16LE(1, 32);
  buffer.writeUInt16LE(8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(sampleCount, 40);
  return buffer;
}

/** 打开 AI 服务状态面板并切换到指定状态。 */
async function setAutoSpeech(page: Page, enabled: boolean) {
  await page.getByRole('button', { name: 'AI 已连接' }).click();
  const toggle = page.getByRole('switch', { name: '自动朗读' });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-checked')) !== String(enabled)) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
  await page.getByRole('button', { name: '关闭' }).click();
}

test('自动朗读默认关闭时，真实回复只显示文字且不请求语音端点', async ({ page }) => {
  let speechRequests = 0;
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, mode: 'live', model: 'deepseek-flash' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '这是来自聊天网关的回答。', source: 'live' }) });
  });
  await page.route('**/api/speech', async (route) => {
    speechRequests += 1;
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() });
  });

  await resetDemoState(page);
  await page.goto('/tutor');
  await page.getByLabel('输入问题').fill('请用一句话解释 TCP 慢启动。');
  await page.getByRole('button', { name: '发送给 AI 导师' }).click();
  await expect(page.locator('.tutor-message--assistant')).toContainText('这是来自聊天网关的回答。');
  await expect.poll(() => speechRequests).toBe(0);

  // 面板中的开关默认处于关闭状态。
  await page.getByRole('button', { name: 'AI 已连接' }).click();
  await expect(page.getByRole('switch', { name: '自动朗读' })).toHaveAttribute('aria-checked', 'false');
});

test('开启自动朗读后，AI导师与 Pico 的 live 文本回复都会请求同一语音端点并自动播放', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    const probe = { attempts: 0, played: 0, rejected: 0 };
    const AudioProbe = function (this: HTMLAudioElement) {
      const element = new NativeAudio();
      const nativePlay = element.play.bind(element);
      element.play = async () => {
        probe.attempts += 1;
        try {
          await nativePlay();
          probe.played += 1;
        } catch (error) {
          probe.rejected += 1;
          throw error;
        }
      };
      return element;
    } as unknown as typeof Audio;
    AudioProbe.prototype = NativeAudio.prototype;
    Object.defineProperty(window, 'Audio', { configurable: true, value: AudioProbe });
    (window as typeof window & { __speechProbe?: typeof probe }).__speechProbe = probe;
  });
  const speechBodies: Array<{ text: string }> = [];
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: true, mode: 'live', model: 'deepseek-flash' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ text: '这是来自聊天网关的回答。', source: 'live' }) });
  });
  await page.route('**/api/speech', async (route) => {
    speechBodies.push(route.request().postDataJSON() as { text: string });
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() });
  });

  await resetDemoState(page);
  await page.goto('/tutor');
  await setAutoSpeech(page, true);
  await page.getByLabel('输入问题').fill('请用一句话介绍 TCP。');
  await page.getByRole('button', { name: '发送给 AI 导师' }).click();
  await expect(page.locator('.tutor-message--assistant')).toContainText('这是来自聊天网关的回答。');
  await expect.poll(() => speechBodies.length).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __speechProbe?: { played: number } }).__speechProbe?.played ?? 0)).toBe(1);

  await page.goto('/library/computer/tree/tree-408/point/knowledge-linear-list/study');
  await page.getByRole('button', { name: '问问 Pico：线性表' }).click();
  await expect(page.locator('.pico-message--assistant')).toContainText('这是来自聊天网关的回答。');
  await expect.poll(() => speechBodies.length).toBe(2);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __speechProbe?: { played: number } }).__speechProbe?.played ?? 0)).toBe(1);
  expect(speechBodies).toEqual([
    { text: '这是来自聊天网关的回答。' },
    { text: '这是来自聊天网关的回答。' },
  ]);
});
