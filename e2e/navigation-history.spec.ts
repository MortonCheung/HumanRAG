import { expect, test, type Page } from '@playwright/test';
import { resetDemoState } from './helpers';

const TREE_PATH = '/library/computer/tree/tree-408/path';
const TCP_STUDY = '/library/computer/tree/tree-408/point/knowledge-tcp/study';

async function rememberNav(page: Page) {
  await page.evaluate(() => {
    (window as typeof window & { __persistentGlobalNav?: Element | null }).__persistentGlobalNav = document.querySelector('header.context-nav');
  });
}

async function expectSameNav(page: Page) {
  expect(await page.evaluate(() => (
    (window as typeof window & { __persistentGlobalNav?: Element | null }).__persistentGlobalNav
      === document.querySelector('header.context-nav')
  ))).toBe(true);
  await expect(page.locator('header.context-nav')).toHaveCount(1);
}

async function enterTcpPoint(page: Page) {
  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: /TCP可靠传输/ }).click();
  await expect(page.getByRole('button', { name: '自学' })).toBeVisible();
}

test('持久导航跨越核心区域，Back 返回真实来源', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetDemoState(page);
  await page.goto('/universe');
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 30_000 });
  await rememberNav(page);

  await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expectSameNav(page);

  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(new RegExp(`${TREE_PATH}$`));
  await expectSameNav(page);
  await enterTcpPoint(page);
  await page.getByRole('button', { name: '自学' }).click();
  await expect(page).toHaveURL(new RegExp(`${TCP_STUDY}$`));
  await expectSameNav(page);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${TREE_PATH}$`));
  await expect(page.locator('html')).toHaveAttribute('data-route-direction', 'back');

  await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '我的学习' }).click();
  await expect(page).toHaveURL(/\/progress$/);
  await expectSameNav(page);

  await page.locator('.learning-dashboard__next-point').click();
  await expect(page).toHaveURL(/\/study$/);
  await expectSameNav(page);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);

  await page.locator('.learning-dashboard__cta').click();
  await expect(page).toHaveURL(/\/(?:teach|verify|study)$/);
  await expectSameNav(page);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(/\/progress$/);

  await page.getByRole('navigation', { name: '应用切换' }).getByRole('link', { name: '知识库' }).click();
  await page.getByRole('button', { name: '进入知识树' }).click();
  await enterTcpPoint(page);
  await page.getByRole('button', { name: '刷题' }).click();
  await expect(page).toHaveURL(/\/verify$/);
  await expectSameNav(page);
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${TREE_PATH}$`));
});

test('直接打开深层学习页时 Back 使用知识树 fallback', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(TCP_STUDY);
  await expect(page.getByRole('button', { name: '返回', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${TREE_PATH}$`));
  await expect(page.locator('html')).toHaveAttribute('data-route-direction', 'back');
});
