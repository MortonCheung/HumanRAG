import { expect, test, type Locator, type Page } from '@playwright/test';
import { clickPageAction, resetDemoState } from './helpers';

async function readVector(canvas: Locator, attribute: string, length: number) {
  const raw = await canvas.getAttribute(attribute);
  const values = raw?.split(',').map(Number) ?? [];
  expect(values).toHaveLength(length);
  expect(values.every(Number.isFinite)).toBe(true);
  return values;
}

async function waitForCameraRest(page: Page, canvas: Locator) {
  let previous: number[] | null = null;
  let stableSamples = 0;
  await expect.poll(async () => {
    const pose = await readVector(canvas, 'data-spatial-camera', 6);
    const delta = previous ? Math.max(...pose.map((value, index) => Math.abs(value - previous![index]))) : Infinity;
    stableSamples = delta < 0.01 ? stableSamples + 1 : 0;
    previous = pose;
    return stableSamples;
  }, { timeout: 10_000, intervals: [80, 80, 100, 120] }).toBeGreaterThanOrEqual(3);
  return readVector(canvas, 'data-spatial-camera', 6);
}

test('关闭节点详情与顶部复位得到相同的 Camera Position、Target 和零 Focal Offset', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetDemoState(page);
  await page.goto('/universe');
  const canvas = page.locator('canvas[aria-label="计算机知识关系图"]');
  await expect(canvas).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });

  await clickPageAction(page, '视图复位');
  const resetPose = await waitForCameraRest(page, canvas);

  await page.keyboard.press('/');
  await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
  await page.locator('.command-result').filter({ has: page.getByText('线性表', { exact: true }) }).first().click();
  const detail = page.locator('.node-inspector.is-expanded');
  await expect(detail).toBeVisible();
  const focusPose = await waitForCameraRest(page, canvas);
  expect(Math.max(...focusPose.map((value, index) => Math.abs(value - resetPose[index])))).toBeGreaterThan(1);

  await detail.getByRole('button', { name: '关闭节点详情' }).click();
  await expect(detail).toHaveCount(0);
  const closePose = await waitForCameraRest(page, canvas);
  closePose.forEach((value, index) => expect(Math.abs(value - resetPose[index])).toBeLessThan(0.25));

  const focalOffset = await readVector(canvas, 'data-spatial-focal-offset', 3);
  focalOffset.forEach((value) => expect(Math.abs(value)).toBeLessThan(0.01));
});
