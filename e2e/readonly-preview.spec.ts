import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

// 知识点视图左侧模型是展示品 —— 树在转，相机锁死，交互锁死。
test.use({ hasTouch: true });

test('path：左侧模型只读（树转、相机不动、选择不变）', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await resetDemoState(page);
    await page.goto('/library/computer/tree/tree-408/path');

    const canvas = page.locator('[data-spatial-stage] canvas');
    await expect(canvas).toBeVisible({ timeout: 12_000 });
    await expect(canvas).toHaveAttribute('data-tree-scene-mode', 'tree');
    await expect(canvas).toHaveAttribute('data-preview-tree-id', 'tree-408');

    const cameraBefore = await canvas.getAttribute('data-preview-camera');
    expect(cameraBefore).toBeTruthy();
    const rotationBefore = await canvas.getAttribute('data-preview-tree-rotation');
    const selectedBefore = await page.locator('.custom-tree-node-label').allTextContents();

    const stageBox = await page.locator('[data-spatial-stage]').boundingBox();
    expect(stageBox).not.toBeNull();
    const centerX = stageBox!.x + stageBox!.width / 2;
    const centerY = stageBox!.y + stageBox!.height / 2;

    // 滚轮缩放
    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, -900);
    // 指针拖拽旋转
    await page.mouse.move(centerX + 16, centerY + 16);
    await page.mouse.down();
    await page.mouse.move(centerX + 200, centerY + 150, { steps: 16 });
    await page.mouse.up();
    // 触控拖拽
    await page.evaluate(([x, y]) => {
      const target = document.querySelector('[data-spatial-stage] canvas');
      if (!target || typeof Touch === 'undefined') return;
      const touch = (type: string, points: Array<[number, number]>) => {
        target.dispatchEvent(new TouchEvent(type, {
          bubbles: true,
          cancelable: true,
          touches: points.map(([clientX, clientY]) => new Touch({ identifier: 1, target, clientX, clientY })),
        }));
      };
      touch('touchstart', [[x, y]]);
      touch('touchmove', [[x + 140, y + 110]]);
      touch('touchend', []);
    }, [centerX, centerY]);

    // 相机与选择都不允许变化。
    expect(await canvas.getAttribute('data-preview-camera')).toBe(cameraBefore);
    expect(await page.locator('.custom-tree-node-label').allTextContents()).toEqual(selectedBefore);

    // 但模型自己持续慢速旋转。
    await expect
      .poll(() => canvas.getAttribute('data-preview-tree-rotation'), { timeout: 5_000 })
      .not.toBe(rotationBefore);

    // 右侧仍是正常可用的工作区。
    await expect(page.getByRole('heading', { name: '知识点' })).toBeVisible();
});
