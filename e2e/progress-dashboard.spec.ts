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

test('编辑学习者资料会立即刷新并持久化，不改变原学习档案', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetDemoState(page);
  await page.goto('/progress');
  const recordCountBefore = await page.evaluate(() => {
    const raw = localStorage.getItem('iteach:v7:progress-delta');
    return raw ? JSON.parse(raw).data?.evidenceRecords?.length ?? 0 : 0;
  });

  await page.getByRole('button', { name: '编辑资料' }).click();
  const editor = page.getByRole('dialog', { name: '编辑资料' });
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel('姓名')).toBeFocused();
  await editor.getByLabel('姓名').fill('林知行');
  await editor.getByLabel('专业').fill('软件工程');
  await editor.getByLabel('学习阶段 / 身份').fill('大四');
  await editor.getByLabel('当前目标').fill('准备计算机考研复试');
  await editor.getByRole('button', { name: '保存' }).click();

  await expect(page.getByRole('heading', { name: '林知行' })).toBeVisible();
  await expect(page.locator('.learning-dashboard__profile')).toContainText('软件工程');
  await page.reload();
  await expect(page.getByRole('heading', { name: '林知行' })).toBeVisible();
  expect(await page.evaluate(() => {
    const raw = localStorage.getItem('iteach:v7:progress-delta');
    return raw ? JSON.parse(raw).data?.evidenceRecords?.length ?? 0 : 0;
  })).toBe(recordCountBefore);

  await page.getByRole('button', { name: '编辑资料' }).click();
  await page.getByRole('dialog', { name: '编辑资料' }).getByRole('button', { name: '恢复默认' }).click();
  await expect(page.getByRole('heading', { name: '演示学习者' })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑资料' })).toBeFocused();
});
