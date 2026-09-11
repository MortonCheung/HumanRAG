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
    await expect(page.locator('#landing-title')).toBeVisible({ timeout: 12_000 });
    await expectNoHorizontalOverflow(page);

    for (const path of ['/library', '/library/computer/tree/tree-408', '/progress']) {
      await page.goto(path);
      await expect(page.locator('main, .page').first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('390px：开屏保持单一入口且知识图谱覆盖全屏', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetDemoState(page);
  const primary = page.getByRole('button', { name: '进入知识空间' });
  const network = page.locator('.spatial-canvas-layer canvas');

  const [primaryBox, networkBox] = await Promise.all([
    primary.boundingBox(),
    network.boundingBox(),
  ]);
  expect(primaryBox!.width).toBeGreaterThanOrEqual(240);
  expect(primaryBox!.height).toBeGreaterThanOrEqual(44);
  expect(primaryBox!.x).toBeGreaterThanOrEqual(16);
  expect(primaryBox!.x + primaryBox!.width).toBeLessThanOrEqual(374);
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(844);
  const titleBox = await page.locator('#landing-title').boundingBox();
  expect(primaryBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height + 24);
  await expect(page.getByRole('link', { name: '我的知识库' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '刷题' })).toHaveCount(0);
  expect(networkBox!.y).toBeLessThanOrEqual(1);
  expect(networkBox!.height).toBeGreaterThanOrEqual(840);
});

test('390px：知识树与节点创建流程无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await resetDemoState(page);
  await page.goto('/library/computer/trees/new');
  await expect(page.locator('.context-nav__title')).toHaveText('新建知识树');
  await page.getByLabel('名称').fill('移动端知识树');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await page.getByRole('button', { name: '新增节点' }).click();
  await expect(page.locator('.context-nav__title')).toHaveText('新建知识点');
  await expect(page.getByRole('button', { name: '下一步' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
