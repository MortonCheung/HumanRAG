import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test.describe('知识库、知识树与知识点创建', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('知识库总览严格分为三维预览、知识树管理和集中操作', async ({ page }) => {
    await page.goto('/library');
    await expect(page.getByRole('heading', { name: '计算机科学' })).toBeVisible();
    await expect(page.getByLabel('考研408三维预览')).toBeVisible();
    await expect(page.locator('[data-spatial-stage] canvas')).toHaveCount(1);
    await expect(page.getByRole('listbox', { name: '知识树列表' })).toBeVisible();
    await expect(page.getByRole('button', { name: /进入知识树/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /能力验证/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /创建知识树/ })).toBeVisible();

    const canvas = page.locator('[data-spatial-stage] canvas');
    const canvasIdentity = await canvas.evaluateHandle((element) => element);
    const cameraBefore = await canvas.getAttribute('data-preview-camera');
    await page.getByRole('option', { name: /AI工程/ }).click();
    await expect(page.getByLabel('AI工程三维预览')).toBeVisible();
    await expect(canvas).toHaveAttribute('data-preview-tree-id', 'tree-ai');
    await expect.poll(() => canvas.getAttribute('data-preview-camera')).not.toBe(cameraBefore);
    expect(await canvasIdentity.evaluate((element) => element === document.querySelector('[data-spatial-stage] canvas'))).toBe(true);
    await expect(page.getByText(/棵知识树|个节点|系统/)).toHaveCount(0);
    await expect(page).toHaveURL(/\/library$/);
    await page.getByRole('button', { name: /进入知识树/ }).click();
    await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-ai$/);
    await expect(page.getByRole('heading', { name: '选择知识点' })).toBeVisible();
  });

  test('知识树允许稍后补充信息，但拒绝同名树', async ({ page }) => {
    await page.goto('/library/computer/trees/new');
    await expect(page.locator('.context-nav__title')).toHaveText('新建知识树');

    await page.getByLabel('名称').fill('考研408');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page.getByText('这个知识库中已经有同名知识树。')).toBeVisible();

    await page.getByLabel('名称').fill('');
    await page.getByRole('button', { name: '创建', exact: true }).click();
    await expect(page).toHaveURL(/\/library\/computer\/tree\/tree-[\da-f-]+\/edit\/structure$/);
    await expect(page.getByText('暂无知识点')).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v9:domain')))).toBe(true);
  });

  test('知识卡片经过内容与空间关系两步后进入三维知识树', async ({ page }) => {
    await page.goto('/library/computer/trees/new');
    await page.getByLabel('名称').fill('计算机图形学');
    await page.getByRole('button', { name: '创建', exact: true }).click();

    await page.getByRole('button', { name: '新增节点' }).click();
    await expect(page.locator('.context-nav__title')).toHaveText('新建知识点');
    await page.getByLabel('名称').fill('光栅化管线');
    await page.getByLabel('说明').fill('从几何图元生成像素片段的过程。');
    await page.getByRole('button', { name: '下一步' }).click();

    await expect(page.locator('.context-nav__title')).toHaveText('位置与关系');
    await expect(page.locator('.point-placement-page__tree canvas')).toBeVisible();
    await page.getByRole('button', { name: '创建', exact: true }).click();

    await expect(page).toHaveURL(/\/edit\/structure$/);
    await expect(page.getByText('光栅化管线', { exact: true }).first()).toBeVisible();
    await expect(page.locator('.tree-structure-editor-page__canvas canvas')).toBeVisible();

    await page.getByRole('button', { name: /光栅化管线/ }).click();
    await page.getByLabel('学习内容').fill('光栅化、片元处理与深度测试。');
    await page.getByLabel('难度').selectOption('进阶');
    await page.getByRole('button', { name: '保存' }).click();
    await page.reload();
    await page.getByRole('button', { name: /光栅化管线/ }).click();
    await expect(page.getByLabel('学习内容')).toHaveValue('光栅化、片元处理与深度测试。');
    await expect(page.getByLabel('难度')).toHaveValue('进阶');
  });
});
