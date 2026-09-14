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

  await page.getByRole('navigation', { name: '知识树页面' }).getByRole('link', { name: '测验' }).click();
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

// 第 57 章：任一时刻只有一个相机所有者。Universe 由 CameraController 拥有，
// Library / 知识树由预览相机拥有，两者互斥，且都与共享 Canvas 同生命周期。
test('同一时刻只有一个相机所有者', async ({ page }) => {
  await resetDemoState(page);
  await page.goto('/universe');
  const stage = page.locator('[data-spatial-stage] canvas');
  await expect(stage).toBeVisible({ timeout: 12_000 });

  const poseOf = async (attribute: string) => {
    const value = await stage.getAttribute(attribute);
    return value ? value.split(',').map(Number) : null;
  };

  // Universe：CameraController 发布位姿，预览相机不存在。
  await expect.poll(() => poseOf('data-spatial-camera')).not.toBeNull();
  const universePose = await poseOf('data-spatial-camera');
  expect(universePose).toHaveLength(6);
  expect(universePose!.every((component) => Number.isFinite(component))).toBe(true);
  expect(await poseOf('data-preview-camera')).toBeNull();

  // Library：所有权移交给预览相机，且没有残留的第二套相机。
  await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect.poll(() => poseOf('data-preview-camera')).not.toBeNull();
  const previewPose = await poseOf('data-preview-camera');
  expect(previewPose).toHaveLength(6);
  expect(previewPose!.every((component) => Number.isFinite(component))).toBe(true);
  expect(await poseOf('data-spatial-camera')).toBeNull();

  // 共享 Canvas 在交接前后是同一个，相机所有权不靠重建场景实现。
  await expect(stage).toHaveCount(1);
  await expect(stage).toHaveAttribute('data-preview-tree-id', /./);
});
