import { expect, test } from '@playwright/test';
import { clickPageAction, resetDemoState } from './helpers';

async function expectMenuInsideViewportAndOnTop(page: import('@playwright/test').Page, selector: string) {
  const menu = page.locator(selector);
  await expect(menu).toBeVisible();
  const box = await menu.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);

  const controls = menu.locator('button, a');
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    if (!await control.isVisible()) continue;
    expect(await control.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top === element || element.contains(top);
    })).toBe(true);
  }
}

// 宽屏直接展示少量页面操作；空间不足时才进入同一个 overflow。
for (const width of [390, 768, 1024, 1366, 1440]) {
  test(`${width}px：导航左中右锚定，主按钮完整可见，页面操作响应式布局`, async ({ page }) => {
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

    const actions = page.locator('#context-nav-actions');
    if (width >= 1100) {
      await expect(page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识空间' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' })).toBeVisible();
      await expect(page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '我的学习' })).toBeVisible();
      await expect(actions).toBeVisible();
      await expect(page.getByRole('button', { name: '页面操作' })).toBeHidden();
    } else {
      await expect(actions).toBeHidden();
      await page.getByRole('button', { name: '页面操作' }).click();
      await expect(actions).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /创建知识树/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^测验$/ })).toBeVisible();
  });
}

for (const width of [390, 768, 1024]) {
  test(`${width}px：页面操作菜单位于 Inspector 之上且完整可点击`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await resetDemoState(page);
    await page.goto('/universe');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });

    await page.keyboard.press('/');
    await page.getByRole('textbox', { name: '搜索输入' }).fill('线性表');
    await page.locator('.command-result').filter({ has: page.getByText('线性表', { exact: true }) }).first().click();
    const inspector = page.locator('.node-inspector.is-expanded');
    await expect(inspector).toBeVisible();

    await page.getByRole('button', { name: '页面操作' }).click();
    await expectMenuInsideViewportAndOnTop(page, '#context-nav-actions');
    if (width >= 1024) {
      const menuBox = await page.locator('#context-nav-actions').boundingBox();
      const inspectorBox = await inspector.boundingBox();
      const overlapWidth = Math.min(menuBox!.x + menuBox!.width, inspectorBox!.x + inspectorBox!.width) - Math.max(menuBox!.x, inspectorBox!.x);
      const overlapHeight = Math.min(menuBox!.y + menuBox!.height, inspectorBox!.y + inspectorBox!.height) - Math.max(menuBox!.y, inspectorBox!.y);
      expect(Math.max(0, overlapWidth) * Math.max(0, overlapHeight)).toBeGreaterThan(0);
    }

    await page.getByRole('button', { name: '视图复位' }).click();
    await expect(inspector).toHaveCount(0);

    if (width === 390) {
      await clickPageAction(page, '选择目标');
      await expect(page.getByRole('complementary', { name: '整理目标' })).toBeVisible();
      await page.getByRole('button', { name: '切换页面' }).click();
      await expectMenuInsideViewportAndOnTop(page, '#context-nav-app-menu');
      await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
      await expect(page).toHaveURL(/\/library$/);
    }
  });
}
