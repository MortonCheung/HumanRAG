import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

async function pageAction(page: Page, name: string) {
  const action = page.getByRole('banner').getByRole('button', { name, exact: true, includeHidden: true });
  const disclosure = page.getByRole('button', { name: '页面操作', exact: true });
  await expect(action).toBeAttached();
  if (!await action.isVisible()) {
    await expect(disclosure).toBeVisible();
    await disclosure.click();
  }
  return action;
}

for (const width of [1440, 768, 390]) {
  test(`${width}px：五轮知识库与知识点详情保持同一棵空间树`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await resetDemoState(page);
    await page.goto('/universe');
    if (width < 768) await page.getByRole('button', { name: '切换页面' }).click();
    await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
    const canvas = page.locator('[data-spatial-stage] canvas');
    const canvasIdentity = await canvas.evaluateHandle((element) => element);
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(await pageAction(page, '创建知识树')).toBeVisible();
      await (await pageAction(page, '进入知识树')).click();
      await expect(page).toHaveURL(/\/tree-408\/path$/);
      const pathGroups = page.locator('.tree-path-panel .point-group__header');
      await expect(pathGroups.first()).toBeVisible();
      const pathGroupCount = await pathGroups.count();
      expect(pathGroupCount).toBeGreaterThan(3);
      const expandedCount = await pathGroups.evaluateAll((headers) => headers.filter((header) => header.getAttribute('aria-expanded') === 'true').length);
      expect(expandedCount).toBeGreaterThan(0);
      expect(expandedCount).toBeLessThan(pathGroupCount);
      await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
      const pathPoint = page.getByRole('button', { name: /TCP可靠传输/ });
      await expect(pathPoint).toBeVisible();
      await pathPoint.click();
      await expect(page.getByRole('button', { name: '返回知识点' })).toBeVisible();
      await expect(page.getByRole('button', { name: '自学' })).toBeVisible();
      await expect(page.getByRole('button', { name: '带我学' })).toBeVisible();
      await expect(page.getByRole('button', { name: '刷题' })).toBeVisible();
      expect(await canvasIdentity.evaluate((element) => element === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
      await page.getByRole('button', { name: '返回知识点' }).click();
      await expect(page.getByRole('searchbox', { name: '搜索知识点' })).toHaveValue('TCP可靠传输');
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: '返回知识库', exact: true }).click();
    }
  });
}
