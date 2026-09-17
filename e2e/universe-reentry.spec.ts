import { expect, test, type Locator } from '@playwright/test';
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

for (const source of ['知识库', '知识树'] as const) {
  test(`${source}返回 Universe 不重播 Opening，并在原 Canvas 内清除陈旧节点镜头`, async ({ page }) => {
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
    const canvas = page.locator('canvas[aria-label="计算机知识关系图"]');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });
    const canvasIdentity = await canvas.evaluateHandle((element) => element);
    const overviewPose = await waitForCameraRest(canvas);
    await page.keyboard.press('/');
    await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
    await page.locator('.command-result').filter({ has: page.getByText('线性表', { exact: true }) }).first().click();
    await expect(page.locator('.node-inspector.is-expanded')).toBeVisible();
    const focusedPose = await waitForCameraRest(canvas);
    expect(maxDelta(focusedPose, overviewPose)).toBeGreaterThan(0.5);

    await openProductArea(page, '知识库');
    await expect(page).toHaveURL(/\/library$/);
    if (source === '知识树') {
      await page.getByRole('button', { name: '进入知识树' }).click();
      await expect(page).toHaveURL(/\/tree\/[^/]+\/path$/);
    }
    await openProductArea(page, '知识空间');
    await expect(page).toHaveURL(/\/universe$/);
    await expect(page.getByRole('button', { name: '进入知识空间' })).toHaveCount(0);

    await expect(page.locator('.node-inspector.is-expanded')).toHaveCount(0);
    const returnedPose = await waitForCameraRest(canvas);
    await expect.poll(() => canvasIdentity.evaluate((element) => element === document.querySelector('canvas[aria-label="计算机知识关系图"]'))).toBe(true);
    expect(maxDelta(returnedPose, overviewPose)).toBeLessThan(0.25);
    expect(maxDelta(returnedPose, focusedPose)).toBeGreaterThan(0.5);
    expect(await page.evaluate(() => (document as Document & { __viewTransitionCalls?: number }).__viewTransitionCalls ?? 0)).toBe(0);
  });
}
