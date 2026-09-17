import { expect, test, type Locator, type Page } from '@playwright/test';
import { openProductArea, resetDemoState } from './helpers';

function maxDelta(left: number[], right: number[]) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

async function readPose(canvas: Locator) {
  return (await canvas.getAttribute('data-spatial-camera'))!.split(',').map(Number);
}

async function waitForCameraRest(canvas: Locator) {
  let previous: number[] | null = null;
  let stable = 0;
  await expect.poll(async () => {
    const pose = await readPose(canvas);
    const delta = previous ? maxDelta(pose, previous) : Infinity;
    stable = delta < 0.01 ? stable + 1 : 0;
    previous = pose;
    return stable;
  }, { timeout: 10_000, intervals: [80, 80, 100, 120] }).toBeGreaterThanOrEqual(3);
  return readPose(canvas);
}

async function observeReentry(page: Page) {
  await page.evaluate(() => {
    const target = document.querySelector('[data-spatial-stage] canvas')!;
    const samples: number[][] = [];
    const capture = () => {
      const raw = target.getAttribute('data-spatial-camera');
      if (raw) samples.push(raw.split(',').map(Number));
    };
    (window as typeof window & { __universeReentrySamples?: number[][] }).__universeReentrySamples = samples;
    const observer = new MutationObserver(capture);
    observer.observe(target, { attributes: true, attributeFilter: ['data-spatial-camera'] });
    window.setTimeout(() => observer.disconnect(), 3_000);
  });
}

for (const source of ['知识库', '知识树'] as const) {
  test(`${source}返回 Universe 不重播 Opening，并在原 Canvas 内恢复最后视角`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      const documentWithProbe = document as Document & { __viewTransitionCalls?: number };
      documentWithProbe.__viewTransitionCalls = 0;
      const original = document.startViewTransition?.bind(document);
      if (original) document.startViewTransition = ((callback) => {
        documentWithProbe.__viewTransitionCalls = (documentWithProbe.__viewTransitionCalls ?? 0) + 1;
        return original(callback);
      }) as typeof document.startViewTransition;
    });
    await resetDemoState(page);
    await page.goto('/universe');
    const canvas = page.locator('[data-spatial-stage] canvas');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });
    const canvasIdentity = await canvas.evaluateHandle((element) => element);
    await page.keyboard.press('/');
    await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
    await page.locator('.command-result').filter({ has: page.getByText('线性表', { exact: true }) }).first().click();
    await expect(page.locator('.node-inspector.is-expanded')).toBeVisible();
    const originalPose = await waitForCameraRest(canvas);

    await openProductArea(page, '知识库');
    await expect(page).toHaveURL(/\/library$/);
    if (source === '知识树') {
      await page.getByRole('button', { name: '进入知识树' }).click();
      await expect(page).toHaveURL(/\/tree\/[^/]+\/path$/);
    }
    await observeReentry(page);
    await openProductArea(page, '知识空间');
    await expect(page).toHaveURL(/\/universe$/);
    await expect(page.getByRole('button', { name: '进入知识空间' })).toHaveCount(0);
    expect(await canvasIdentity.evaluate((element) => element === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);

    await expect(canvas).toHaveAttribute('data-spatial-reentry-state', 'complete', { timeout: 2_000 });
    await expect(canvas).toHaveAttribute('data-spatial-reentry-progress', '1.000');
    const samples = await page.evaluate(() => (
      (window as typeof window & { __universeReentrySamples?: number[][] }).__universeReentrySamples ?? []
    ));
    expect(new Set(samples.map((sample) => sample.map((value) => value.toFixed(1)).join(','))).size).toBeGreaterThan(2);
    expect(maxDelta(await readPose(canvas), originalPose)).toBeLessThan(0.25);
    expect(await page.evaluate(() => (document as Document & { __viewTransitionCalls?: number }).__viewTransitionCalls ?? 0)).toBe(0);
  });
}
