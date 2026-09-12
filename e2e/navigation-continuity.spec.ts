import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

async function pageAction(page: Page, name: string) {
  const action = page.getByRole('banner').getByRole('button', { name, exact: true });
  const disclosure = page.getByRole('button', { name: '页面操作', exact: true });
  await expect(action.or(disclosure)).toBeVisible();
  if (!await action.isVisible()) await disclosure.click();
  return action;
}

for (const width of [1440, 768, 390]) {
  test(`${width}px：五轮知识库、学习路径与能力验证保持同一棵空间树`, async ({ page }) => {
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
      const pathRows = page.locator('.tree-path-panel .tree-panel__group li');
      await expect(pathRows.first()).toBeVisible();
      expect(await pathRows.count()).toBeGreaterThan(20);
      await pathRows.first().getByRole('button').click();
      await expect(page.getByRole('button', { name: '返回学习路径' })).toBeVisible();
      expect(await canvasIdentity.evaluate((element) => element === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
      await page.getByRole('button', { name: '返回学习路径' }).click();
      if (width < 768) await page.getByRole('combobox', { name: '知识树模式' }).selectOption('/library/computer/tree/tree-408/verify');
      else await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '能力验证' }).click();
      await expect(page).toHaveURL(/\/tree-408\/verify$/);
      await expect(page.getByRole('button', { name: /开始能力验证/ })).toBeEnabled();
      const verificationRows = page.locator('.tree-verify-panel .tree-panel__group li');
      await expect(verificationRows.first()).toBeVisible();
      await verificationRows.first().getByRole('button').click();
      await expect(page.getByRole('button', { name: '返回能力验证' })).toBeVisible();
      expect(await canvasIdentity.evaluate((element) => element === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
      await page.getByRole('button', { name: '返回能力验证' }).click();
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: '返回知识库', exact: true }).click();
    }
  });
}
