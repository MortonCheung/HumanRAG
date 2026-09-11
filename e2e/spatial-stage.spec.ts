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
  await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-408$/);
  await expect(stage).toHaveCount(1);
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);

  await page.getByRole('navigation', { name: '知识树模式' }).getByRole('link', { name: '学习' }).click();
  await expect(page).toHaveURL(/\/tree-408\/learn$/);
  expect(await identity.evaluate((canvas) => canvas === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
});
