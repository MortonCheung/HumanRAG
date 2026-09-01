import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test.describe('三维知识空间交互', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('任意可见光点可悬停并由同一面板展开详情', async ({ page }) => {
    await page.goto('/universe');
    await expect(page.locator('canvas[aria-label*="336 个知识节点"]')).toBeVisible();
    await page.waitForTimeout(1_200);

    let hit: { x: number; y: number } | null = null;
    for (const y of [240, 290, 340, 390, 440, 490, 540, 590, 640]) {
      for (const x of [480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080]) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(70);
        if (await page.locator('.node-inspector--peek').count()) {
          hit = { x, y };
          break;
        }
      }
      if (hit) break;
    }

    expect(hit).not.toBeNull();
    const peek = page.locator('.node-inspector--peek');
    await expect(peek).toBeVisible();
    await peek.evaluate((element) => {
      (window as typeof window & { __iteachPanel?: Element }).__iteachPanel = element;
    });
    await page.mouse.click(hit!.x, hit!.y);

    const detail = page.locator('.node-inspector.is-expanded');
    await expect(detail).toBeVisible();
    expect(await detail.evaluate((element) => (window as typeof window & { __iteachPanel?: Element }).__iteachPanel === element)).toBe(true);
    await expect(detail.getByRole('heading', { level: 2 })).toBeVisible();

    const canvas = page.locator('canvas[aria-label*="336 个知识节点"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + 160, box!.y + box!.height * 0.62);
    await page.mouse.down();
    await page.mouse.move(box!.x + 330, box!.y + box!.height * 0.56, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, -360);
    await expect(canvas).toBeVisible();
    await expect(page).toHaveURL(/\/universe$/);
  });
});
