import { test } from '@playwright/test';
import { clickPageAction } from './helpers';
import { mkdirSync } from 'node:fs';

const DIR = 'output/v11-final/screencast';

/**
 * 手册第 60 / 61 章的走查录屏：路线 A（Opening → Universe）与路线 B（目标提取 → 知识库）。
 * 约 35s，且产物只是交付证据、不参与断言，所以默认跳过：
 *
 *   SCREENCAST=1 npx playwright test e2e/screencast.spec.ts
 */
test.skip(!process.env.SCREENCAST, '设置 SCREENCAST=1 才重新录制（约 35s）');

test('record: route A + route B', async ({ browser }) => {
  test.setTimeout(240_000);
  mkdirSync(DIR, { recursive: true });

  const record = async (name: string, run: (page: Awaited<ReturnType<typeof browser.newPage>>) => Promise<void>) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: DIR, size: { width: 1440, height: 900 } },
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    await run(page);
    const video = page.video();
    await context.close();
    if (video) {
      await video.saveAs(`${DIR}/${name}.webm`);
      console.log('RECORD', `${DIR}/${name}.webm`);
    }
  };

  // 路线 A：/ → Opening → 进入知识空间 → Universe
  await record('route-a-opening-universe', async (page) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.spatial-experience[aria-busy="false"]', { timeout: 20_000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: '进入知识空间' }).click();
    await page.waitForSelector('.spatial-experience--universe', { timeout: 20_000 });
    await page.waitForTimeout(1600);
  });

  // 路线 B：/universe → 输入目标 → 生成知识树 → /library
  await record('route-b-goal-extraction', async (page) => {
    await page.goto('/universe');
    await page.waitForSelector('.spatial-experience[aria-busy="false"]', { timeout: 20_000 });
    await page.waitForTimeout(800);
    await clickPageAction(page, '选择目标');
    await page.getByLabel('你现在想做什么？').fill('我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。');
    await page.waitForTimeout(900);
    await page.getByRole('button', { name: '生成知识树' }).click();
    await page.waitForURL(/\/library$/, { timeout: 30_000 });
    await page.waitForTimeout(1800);
  });
});
