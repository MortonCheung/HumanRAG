import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

// 第 54 章：导航左中右锚定，主按钮任何 viewport 都不被卡掉，次要操作进 `...`。
for (const width of [390, 768, 1024, 1440]) {
  test(`${width}px：导航左中右锚定，主按钮完整可见，次要操作收进 ...`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await resetDemoState(page);
    await page.goto('/library');
    await expect(page.locator('.library-manager')).toBeVisible();

    const headerBox = await page.locator('header.context-nav').boundingBox();
    expect(headerBox).not.toBeNull();

    // 主操作必须完整落在视口与导航栏内。
    const primaryBox = await page.locator('#context-nav-primary').boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(primaryBox!.x).toBeGreaterThanOrEqual(headerBox!.x - 1);
    expect(primaryBox!.x + primaryBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width + 1);
    await expect(page.getByRole('button', { name: /进入知识树/ })).toBeVisible();

    // 标题真正居中，而不是靠左右两侧的剩余空间"看起来像居中"。
    const titleBox = await page.locator('#context-nav-title').boundingBox();
    expect(titleBox).not.toBeNull();
    expect(
      Math.abs(titleBox!.x + titleBox!.width / 2 - (headerBox!.x + headerBox!.width / 2)),
    ).toBeLessThan(3);

    // 次要操作在桌面端同样收进 `...`，不再直接铺开挤压导航。
    const actions = page.locator('#context-nav-actions');
    await expect(actions).toBeHidden();
    await page.getByRole('button', { name: '页面操作' }).click();
    await expect(actions).toBeVisible();
    await expect(page.getByRole('button', { name: /创建知识树/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^测验$/ })).toBeVisible();
  });
}
