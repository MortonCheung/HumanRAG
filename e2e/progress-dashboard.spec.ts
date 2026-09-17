import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test('我的学习在首屏汇总全局表现，并以 Morph 档案保留详细证据', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetDemoState(page);
  await page.goto('/progress');

  await expect(page.getByRole('banner', { name: '页面导航' })).toContainText('我的学习');
  await expect(page.getByText('整体正确率', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '学习活动' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '需要关注' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '方向表现' })).toBeVisible();
  await expect(page.locator('.learning-dashboard__cta')).toBeVisible();

  await expect(page.locator('.recent-evidence, .evidence-status, .learning-record')).toHaveCount(0);
  const dimensions = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight + 1);
  await expect(page.locator('body')).not.toContainText(/\d+(?:\.\d+)?\s*(?:小时|hours?|h)\b/i);

  const archive = page.getByRole('button', { name: '学习档案' });
  await archive.click();
  const drawer = page.getByRole('dialog', { name: '学习档案' });
  await expect(drawer).toBeVisible();
  expect(await drawer.locator('.learning-record').count()).toBeLessThanOrEqual(20);
  await page.getByRole('button', { name: '关闭学习档案' }).click();
  await expect(drawer).toHaveCount(0);

  await page.getByRole('button', { name: '学习档案' }).click();
  await expect(page.getByRole('dialog', { name: '学习档案' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '学习档案' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '学习档案' })).toBeFocused();
});
