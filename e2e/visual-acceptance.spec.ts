import { expect, test, type Page } from '@playwright/test';
import { TCP_TASKS } from '../src/data/v6/handcrafted/tcpLesson';
import { fillTcpResponse, clickPageAction, resetDemoState } from './helpers';

const desktopDir = 'output/v11-final/visual-acceptance/desktop';
const mobileDir = 'output/v11-final/visual-acceptance/mobile';
const shot = (page: Page, path: string) => page.screenshot({ path, animations: 'allow' });

test('生成 1440 × 900 比赛视觉验收矩阵', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await resetDemoState(page);
  await page.goto('/');
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 12_000 });
  await shot(page, `${desktopDir}/01-constellation-opening.png`);

  await page.getByRole('button', { name: '进入知识空间' }).click();
  await expect(page.locator('.spatial-experience--awakening')).toBeVisible();
  await page.waitForTimeout(420);
  await shot(page, `${desktopDir}/02-opening-mid-awakening.png`);
  await expect(page.locator('.spatial-experience--universe')).toBeVisible();
  await shot(page, `${desktopDir}/03-universe-overview.png`);

  await clickPageAction(page, '选择目标');
  await shot(page, `${desktopDir}/04-goal-panel.png`);
  await page.getByLabel('你现在想做什么？').fill('我要准备 408，网络基础比较弱');
  await page.getByRole('button', { name: '生成知识树' }).click();
  await expect(page.getByRole('status')).toContainText('找到相关知识了');
  await shot(page, `${desktopDir}/05-extraction-high-relevance.png`);
  await expect(page.getByRole('status')).toContainText('正在整理成树');
  await shot(page, `${desktopDir}/06-forming-tree.png`);
  await expect(page).toHaveURL(/\/library$/, { timeout: 12_000 });
  await shot(page, `${desktopDir}/07-library-handoff.png`);
  await page.waitForTimeout(650);
  await shot(page, `${desktopDir}/08-library-selected-tree.png`);

  await page.getByRole('option', { name: 'AI工程', exact: true }).click();
  await expect(page.locator('[data-spatial-stage] canvas')).toHaveAttribute('data-preview-tree-id', 'tree-ai');
  await page.waitForTimeout(850);
  await shot(page, `${desktopDir}/09-library-camera-switching.png`);
  await page.getByRole('option', { name: '考研408', exact: true }).click();
  await expect(page.locator('[data-spatial-stage] canvas')).toHaveAttribute('data-preview-tree-id', 'tree-408');
  await page.getByRole('button', { name: '进入知识树' }).click();
  await expect(page).toHaveURL(/\/tree-408\/path$/);
  await shot(page, `${desktopDir}/10-knowledge-tree-path.png`);

  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: /TCP可靠传输/ }).last().click();
  await shot(page, `${desktopDir}/11-node-detail.png`);
  await page.getByRole('button', { name: '学习', exact: true }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByRole('heading', { name: 'TCP可靠传输', level: 1 })).toBeVisible();
  await page.waitForTimeout(450);
  await shot(page, `${desktopDir}/12-study.png`);
  await page.getByRole('link', { name: '需要引导' }).click();
  await expect(page).toHaveURL(/\/teach$/);
  await expect(page.getByRole('heading', { name: '窗口，怎样一步步变大？' })).toBeVisible();
  await page.waitForTimeout(450);
  await shot(page, `${desktopDir}/13-teach.png`);
  await page.goto('/library/computer/tree/tree-408/point/knowledge-tcp/verify');
  await expect(page.locator('.tcp-response')).toBeVisible();
  await shot(page, `${desktopDir}/14-verification.png`);

  const pair = TCP_TASKS.filter((task) => task.role === 'predict' || task.role === 'observe').slice(0, 2);
  await fillTcpResponse(page, pair[0], 'growth-error');
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('button', { name: '下一题' }).click();
  await fillTcpResponse(page, pair[1]);
  await page.getByRole('button', { name: '提交答案' }).click();
  await page.getByRole('button', { name: '完成验证' }).click();
  await clickPageAction(page, '学习记录');
  await expect(page.getByRole('heading', { name: '当前学习状态' })).toBeVisible();
  await page.waitForTimeout(450);
  await shot(page, `${desktopDir}/15-learning-evidence.png`);
});

test('生成 390 × 844 核心移动端验收矩阵', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await resetDemoState(page);
  await page.goto('/');
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 12_000 });
  await shot(page, `${mobileDir}/01-opening.png`);
  await page.getByRole('button', { name: '进入知识空间' }).click();
  await expect(page.locator('.spatial-experience--universe')).toBeVisible();
  await shot(page, `${mobileDir}/03-universe.png`);
  await clickPageAction(page, '选择目标');
  await shot(page, `${mobileDir}/04-goal-panel.png`);
  await page.getByRole('button', { name: '关闭目标' }).click();

  await page.goto('/library');
  await clickPageAction(page, '进入知识树');
  await expect(page).toHaveURL(/\/tree-408\/path$/);
  await shot(page, `${mobileDir}/10-knowledge-tree-path.png`);
  await page.getByRole('searchbox', { name: '搜索知识点' }).fill('TCP可靠传输');
  await page.getByRole('button', { name: /TCP可靠传输/ }).last().click();
  await shot(page, `${mobileDir}/11-node-detail.png`);
  await page.getByRole('button', { name: '学习', exact: true }).click();
  await expect(page).toHaveURL(/\/study$/);
  await expect(page.getByRole('heading', { name: 'TCP可靠传输', level: 1 })).toBeVisible();
  await shot(page, `${mobileDir}/12-study.png`);
  await page.getByRole('link', { name: '需要引导' }).click();
  await expect(page).toHaveURL(/\/teach$/);
  await expect(page.getByRole('heading', { name: '窗口，怎样一步步变大？' })).toBeVisible();
  await shot(page, `${mobileDir}/13-teach.png`);
  await page.goto('/library/computer/tree/tree-408/point/knowledge-tcp/verify');
  await expect(page.locator('.tcp-response')).toBeVisible();
  await shot(page, `${mobileDir}/14-verification.png`);
  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: '当前学习状态' })).toBeVisible();
  await shot(page, `${mobileDir}/15-learning-evidence.png`);
});
