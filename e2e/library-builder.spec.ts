import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test.describe('知识库、知识树与知识点创建', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('知识库总览严格分为三维预览、知识树管理和集中操作', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: '计算机科学' })).toBeVisible();
    await expect(page.getByLabel('考研408三维预览').locator('canvas')).toBeVisible();
    await expect(page.getByRole('listbox', { name: '知识树列表' })).toBeVisible();
    await expect(page.getByRole('button', { name: /进入知识树/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /综合题库/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /创建知识树/ })).toBeVisible();

    await page.getByRole('option', { name: /AI工程/ }).click();
    await expect(page.getByLabel('AI工程三维预览')).toBeVisible();
    await expect(page).toHaveURL(/\/library$/);
    await page.getByRole('button', { name: /进入知识树/ }).click();
    await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-ai$/);
    await expect(page.getByText('使用模式')).toBeVisible();
  });

  test('知识树允许稍后补充信息，但拒绝同名树', async ({ page }) => {
    await page.goto('/library/computer/trees/new');
    await expect(page.getByRole('heading', { name: '创建知识树' })).toBeVisible();

    await page.getByLabel('名称').fill('考研408');
    await page.getByRole('button', { name: '创建知识树' }).click();
    await expect(page.getByText('这个知识库中已经有同名知识树。')).toBeVisible();

    await page.getByLabel('名称').fill('');
    await page.getByRole('button', { name: '创建知识树' }).click();
    await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-\d+\/edit\/structure$/);
    await expect(page.getByText('这棵知识树还没有节点')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v9:domain')))).toBe(true);
  });

  test('知识卡片经过内容与空间关系两步后进入三维知识树', async ({ page }) => {
    await page.goto('/library/computer/trees/new');
    await page.getByLabel('名称').fill('计算机图形学');
    await page.getByRole('button', { name: '创建知识树' }).click();

    await page.getByRole('button', { name: '新增知识点' }).click();
    await expect(page.getByRole('heading', { name: '编辑知识点' })).toBeVisible();
    await page.getByLabel('名称').fill('光栅化管线');
    await page.getByLabel('说明').fill('从几何图元生成像素片段的过程。');
    await page.getByRole('button', { name: '设置位置与关系' }).click();

    await expect(page.getByRole('heading', { name: '位置与关系' })).toBeVisible();
    await expect(page.locator('.point-placement-page__tree canvas')).toBeVisible();
    await page.getByRole('button', { name: '加入知识树' }).click();

    await expect(page).toHaveURL(/\/edit\/structure$/);
    await expect(page.getByText('光栅化管线', { exact: true })).toBeVisible();
    await expect(page.locator('.tree-structure-editor-page__canvas canvas')).toBeVisible();
  });
});
