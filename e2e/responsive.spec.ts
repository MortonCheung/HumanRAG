import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`${viewport.name}：开屏和核心内容页无横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await resetDemoState(page);
    await expect(page.getByRole('heading', { name: '把计算机知识变成可学习的路径。' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    for (const path of ['/teach', '/practice', '/library', '/progress']) {
      await page.goto(path);
      await expect(page.locator('main, .page').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('390px：开屏为纵向布局，主按钮满宽且次入口并排', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetDemoState(page);
  const primary = page.getByRole('button', { name: '进入知识空间' });
  const library = page.getByRole('link', { name: '我的知识库' });
  const practice = page.getByRole('link', { name: '刷题' });
  const network = page.locator('canvas[aria-label*="计算机知识关系俯视图"]');

  const [primaryBox, libraryBox, practiceBox, networkBox] = await Promise.all([
    primary.boundingBox(),
    library.boundingBox(),
    practice.boundingBox(),
    network.boundingBox(),
  ]);
  expect(primaryBox!.width).toBeGreaterThan(340);
  expect(Math.abs(libraryBox!.y - practiceBox!.y)).toBeLessThan(2);
  expect(networkBox!.y).toBeLessThanOrEqual(1);
  expect(networkBox!.height).toBeGreaterThanOrEqual(840);
});

test('390px：节点定制工作室保持单视口可操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetDemoState(page);
  await page.goto('/library/new');
  await page.getByRole('button', { name: '载入模板草稿' }).click();
  await page.getByRole('navigation', { name: '创建步骤' }).getByRole('button', { name: /结构$/ }).click();
  await page.getByRole('button', { name: /添加节点/ }).click();

  const dialog = page.getByRole('dialog', { name: '定制知识节点' });
  await expect(dialog).toBeVisible();
  await expect(page.getByPlaceholder('例如：进程调度')).toBeFocused();
  await expect(page.getByRole('button', { name: '继续设置位置与关系' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
