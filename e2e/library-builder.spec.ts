import { expect, test } from '@playwright/test';
import { resetDemoState } from './helpers';

test.describe('个人知识库创建与发布', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await resetDemoState(page);
  });

  test('模板生成完整教学和题目后通过校验并发布', async ({ page }) => {
    await page.goto('/library/new');
    await expect(page.getByRole('navigation', { name: '创建步骤' })).toBeVisible();

    await page.getByRole('button', { name: '载入模板草稿' }).click();
    const rail = page.getByRole('navigation', { name: '创建步骤' });

    await rail.getByRole('button', { name: /教学$/ }).click();
    await expect(page.getByRole('heading', { name: '生成教学结构' })).toBeVisible();
    await page.getByRole('button', { name: /^生成教学$/ }).click();
    await expect(page.getByText('8 步闭环', { exact: false }).first()).toBeVisible();

    await rail.getByRole('button', { name: /题目$/ }).click();
    await expect(page.getByRole('heading', { name: '生成题目' })).toBeVisible();
    await page.getByRole('button', { name: /^生成题目$/ }).click();
    await expect(page.getByText('题目预览（前 3 道）')).toBeVisible();

    await rail.getByRole('button', { name: /预览$/ }).click();
    await expect(page.getByText('所有校验通过，可以发布。')).toBeVisible();
    await page.getByRole('button', { name: '保存并发布' }).click();

    await expect(page).toHaveURL(/\/library\/lib-/);
    const detailUrl = page.url();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: '知识结构' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('iteach:v7:libraries')))).toBe(true);

    await page.getByRole('link', { name: '编辑知识库' }).click();
    await expect(page).toHaveURL(/\/library\/lib-.+\/edit$/);
    await expect(page.getByRole('heading', { name: '从资料或模板开始' })).toBeVisible();

    await page.goto(detailUrl);
    await page.getByRole('link', { name: /开始教学/ }).click();
    await expect(page).toHaveURL(/\/teach\/tu-cnode-/);
    await expect(page.getByRole('heading', { name: '学习目标' })).toBeVisible();

    await page.goto(detailUrl);
    await page.getByRole('link', { name: /针对本库刷题/ }).click();
    await expect(page).toHaveURL(/\/practice\/session\/node:cnode-/);
    await expect(page.getByRole('navigation', { name: '题目导航' })).toBeVisible();
  });

  test('空白知识库会阻止缺少关系、教学和题目的发布', async ({ page }) => {
    await page.goto('/library/new');
    await page.getByPlaceholder('例如：数据库系统').fill('E2E 空白知识库');
    await page.getByRole('button', { name: /从空白知识库开始/ }).click();
    await page.getByRole('navigation', { name: '创建步骤' }).getByRole('button', { name: /预览$/ }).click();
    await expect(page.getByRole('group', { name: '发布校验结果' })).toContainText('至少需要一条关系');
    await expect(page.getByRole('button', { name: '保存并发布' })).toBeDisabled();
  });

  test('三维知识树中用两段式工坊添加节点', async ({ page }) => {
    await page.goto('/library/new');
    await page.getByPlaceholder('例如：数据库系统').fill('计算机图形学');
    await page.getByRole('button', { name: /从空白知识库开始/ }).click();
    const rail = page.getByRole('navigation', { name: '创建步骤' });
    await rail.getByRole('button', { name: /结构$/ }).click();

    await expect(page.locator('.builder-tree-stage canvas')).toBeVisible();
    await page.getByRole('button', { name: '添加节点' }).click();
    await page.getByPlaceholder('例如：进程调度').fill('光栅化管线');
    await page.getByRole('button', { name: '继续设置位置与关系' }).click();
    await expect(page.getByText('设置节点属性')).toBeVisible();
    await page.getByLabel('上级节点').selectOption({ index: 1 });
    await page.getByRole('button', { name: /完成并加入知识树/ }).click();

    await expect(page.getByRole('dialog', { name: '定制知识节点' })).toHaveCount(0);
    await expect(page.getByText('2 个节点')).toBeVisible();
    await expect(page.getByText('1 条关系')).toBeVisible();
  });
});
