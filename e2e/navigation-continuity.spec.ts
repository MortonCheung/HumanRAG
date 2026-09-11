import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

async function pageAction(page: Page, name: string) {
  const action = page.getByRole('banner').getByRole('button', { name, exact: true });
  if (!await action.isVisible()) await page.getByRole('button', { name: '页面操作', exact: true }).click();
  return action;
}

for (const width of [1440, 768, 390]) {
  test(`${width}px：五轮知识库、树、学习与题库返程保持唯一导航和完整范围`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await resetDemoState(page);
    await page.goto('/universe');
    if (width < 768) await page.getByRole('button', { name: '切换页面' }).click();
    await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('button', { name: '创建知识树' })).toBeVisible();
      await (await pageAction(page, '进入知识树')).click();
      if (width < 768) await page.getByRole('combobox', { name: '知识树模式' }).selectOption('/library/computer/tree/tree-408/practice');
      else await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '题库' }).click();
      const rows = page.locator('.tree-directory__list > li');
      await expect(rows.first()).toBeVisible();
      const count = await rows.count();
      expect(count).toBeGreaterThan(20);
      await rows.filter({ has: page.getByRole('button', { name: /^图 \d+ 道题/ }) }).getByRole('button').click();
      await expect(page).toHaveURL(/\/point\/knowledge-graph\/practice$/);
      const back = page.getByRole('button', { name: '返回知识树', exact: true });
      const box = await back.boundingBox();
      expect(box!.width).toBeLessThan(150);
      await back.click();
      await expect(rows).toHaveCount(count);
      await expect(page.locator('.tree-directory__heading [role="status"]')).toHaveText(`${count} 个知识点`);
      if (width < 768) await page.getByRole('combobox', { name: '知识树模式' }).selectOption('/library/computer/tree/tree-408/learn');
      else await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '学习', exact: true }).click();
      await expect(page).toHaveURL(/\/tree-408\/learn$/);
      await page.locator('.tree-directory__list button:enabled').first().click();
      await expect(page.getByRole('button', { name: '返回知识树', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '返回知识树', exact: true }).click();
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: '返回知识库', exact: true }).click();
    }
  });
}
