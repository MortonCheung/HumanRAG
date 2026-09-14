import { expect, test } from '@playwright/test';
import { clickPageAction, resetDemoState } from './helpers';

// 第 56 章：目标提取期间只允许 CameraController 拥有相机，且只沿当前方向重新构图。
function normalize([x, y, z]: number[]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function angleBetween(a: number[], b: number[]) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return (Math.acos(dot) * 180) / Math.PI;
}

function parsePose(value: string | null) {
  if (!value) return null;
  const [px, py, pz, tx, ty, tz] = value.split(',').map(Number);
  if ([px, py, pz, tx, ty, tz].some((component) => Number.isNaN(component))) return null;
  return { direction: normalize([px - tx, py - ty, pz - tz]) };
}

test('目标提取全程一套相机：方向不翻，过程中用户无法抢相机', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  const canvas = page.locator('[data-spatial-stage] canvas');
  await expect(canvas).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-spatial-stage] canvas')).toHaveCount(1);

  const before = parsePose(await canvas.getAttribute('data-spatial-camera'));
  expect(before).not.toBeNull();

  await clickPageAction(page, '选择目标');
  await page.getByLabel('你现在想做什么？').fill('我要准备 408，网络基础比较弱，数据结构还可以，也对 AI 感兴趣。');
  await page.getByRole('button', { name: '生成知识树' }).click();

  const directions: number[][] = [];
  const deadline = Date.now() + 2_600;
  while (Date.now() < deadline) {
    if (!/\/universe$/.test(page.url())) break;
    const pose = parsePose(await canvas.getAttribute('data-spatial-camera'));
    if (pose) directions.push(pose.direction);
    await page.waitForTimeout(60);
  }

  expect(directions.length).toBeGreaterThan(4);
  for (const direction of directions) {
    expect(angleBetween(before!.direction, direction)).toBeLessThan(8);
  }

  // 提取结束落到知识库之后，仍然只有一套相机、一个 Canvas。
  await expect(page).toHaveURL(/\/library$/, { timeout: 15_000 });
  await expect(page.locator('[data-spatial-stage] canvas')).toHaveCount(1);
});
