import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test('Universe、Library 与知识树复用同一个 Canvas', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  const stage = page.locator('[data-spatial-stage] canvas');
  await expect(stage).toBeVisible({ timeout: 12_000 });
  const identity = await stage.evaluateHandle((canvas) => canvas);

  await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(stage).toHaveCount(1);
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);

  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-408\/path$/);
  await expect(stage).toHaveCount(1);
  await expect(stage).toHaveAttribute('data-tree-scene-mode', 'tree');
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);

  await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '能力验证' }).click();
  await expect(page).toHaveURL(/\/tree-408\/verify$/);
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);

  const firstPoint = page.locator('.tree-verify-panel .point-group li').first();
  await expect(firstPoint).toBeVisible();
  await firstPoint.getByRole('button').click();
  await expect(page.locator('.tree-point-detail')).toBeVisible();
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
});

test('知识库切树只移动共享镜头，不替换 Canvas', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/library');
  const stage = page.locator('[data-spatial-stage] canvas');
  await expect(stage).toHaveAttribute('data-preview-tree-id', 'tree-408', { timeout: 12_000 });
  const identity = await stage.evaluateHandle((canvas) => canvas);
  const before = await stage.getAttribute('data-preview-camera');

  const aiTree = page.getByRole('option').filter({ hasText: 'AI工程' });
  await aiTree.click();
  await expect(aiTree).toHaveAttribute('aria-selected', 'true');
  await expect(stage).toHaveAttribute('data-preview-tree-id', 'tree-ai');
  await expect.poll(() => stage.getAttribute('data-preview-camera')).not.toBe(before);
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
});
