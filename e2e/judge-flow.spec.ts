import { expect, test } from '@playwright/test';
import { clickPageAction, expectNoHorizontalOverflow, openProductArea, resetDemoState } from './helpers';

test.describe('评委主流程与一级路由', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('从开屏进入知识空间，并能访问精简后的一级页面', async ({ page }) => {
    await expect(page.locator('#landing-title')).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.locator('.spatial-canvas-layer canvas')).toBeVisible({ timeout: 12_000 });

    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page.locator('.spatial-experience--universe')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '应用切换' })).toBeVisible();

    for (const entry of [
      { name: '知识库', path: '/library', heading: '计算机科学' },
    ]) {
      await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: entry.name }).click();
      await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
      await expect(page.getByRole('heading', { name: entry.heading, level: 1 })).toBeVisible();
    }

    await expect(page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '教学' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '刷题' })).toHaveCount(0);

    await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识空间' }).click();
    await openProductArea(page, '我的学习');
    await expect(page).toHaveURL(/\/progress$/);
    await expect(page.getByRole('banner', { name: '页面导航' })).toContainText('我的学习');
    await expect(page.getByText('整体正确率', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('深层路由刷新仍保留当前页面', async ({ page }) => {
    await page.goto('/practice/session/node:knowledge-linear-list');
    await expect(page).toHaveURL(/\/practice\/session\/node:knowledge-linear-list$/);
    await expect(page.getByRole('navigation', { name: '题目导航' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('navigation', { name: '题目导航' })).toBeVisible();
  });
});
