import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

test.describe('评委主流程与一级路由', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('从开屏进入知识空间，并能访问精简后的一级页面', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '计算机知识 一张图学明白' })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.locator('.spatial-canvas-layer canvas')).toBeVisible({ timeout: 12_000 });

    await page.getByRole('button', { name: '进入知识空间' }).click();
    await expect(page).toHaveURL(/\/universe$/);
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('navigation', { name: '一级导航' })).toBeVisible();

    for (const entry of [
      { name: '知识库', path: '/library', heading: '计算机科学' },
    ]) {
      await page.getByRole('navigation', { name: '一级导航' }).getByRole('link', { name: entry.name }).click();
      await expect(page).toHaveURL(new RegExp(`${entry.path}$`));
      await expect(page.getByRole('heading', { name: entry.heading, level: 1 })).toBeVisible();
    }

    await expect(page.getByRole('navigation', { name: '一级导航' }).getByRole('link', { name: '教学' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '一级导航' }).getByRole('link', { name: '刷题' })).toHaveCount(0);

    await page.getByRole('link', { name: '学习记录' }).click();
    await expect(page).toHaveURL(/\/progress$/);
    await expect(page.getByRole('heading', { name: '学习记录', level: 1 })).toBeVisible();
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
