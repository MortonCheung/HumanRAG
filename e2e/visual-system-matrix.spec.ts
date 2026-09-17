import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, resetDemoState } from './helpers';

const viewports = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 390, height: 844 },
] as const;

async function shot(page: Page, directory: string, name: string) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
  await expectNoHorizontalOverflow(page);
}

async function expectSquare(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect.poll(() => locator.evaluate((element) => getComputedStyle(element).borderRadius)).toBe('0px');
}

for (const viewport of viewports) {
  test(`${viewport.width} × ${viewport.height}：七个核心页面属于同一套 Ruled Surface`, async ({ page }) => {
    test.setTimeout(120_000);
    const directory = `output/playwright/v11-final-matrix/${viewport.width}x${viewport.height}`;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(viewport);
    await resetDemoState(page);

    await page.goto('/universe');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 });
    await shot(page, directory, '01-knowledge-space');

    await page.goto('/library');
    await expect(page.getByRole('heading', { name: '计算机科学' })).toBeVisible();
    await expectSquare(page.locator('.library-manager__workspace'));
    await shot(page, directory, '02-library');

    await page.goto('/library/computer/tree/tree-408/path');
    await expect(page.getByRole('heading', { name: '知识点' })).toBeVisible();
    await expectSquare(page.locator('.knowledge-tree-workspace__panel'));
    await shot(page, directory, '03-knowledge-tree');

    await page.goto('/library/computer/tree/tree-408/point/knowledge-tcp/study');
    await expect(page.getByRole('heading', { name: 'TCP可靠传输', level: 1 })).toBeVisible();
    await expectSquare(page.locator('.tcp-demo-stage'));
    await shot(page, directory, '04-study');

    await page.goto('/library/computer/tree/tree-408/point/knowledge-tcp/teach');
    await expect(page.getByRole('heading', { name: '窗口，怎样一步步变大？' })).toBeVisible();
    await expectSquare(page.locator('.tcp-intro__notation'));
    await shot(page, directory, '05-teaching');

    await page.goto('/library/computer/tree/tree-408/point/knowledge-tcp/verify');
    await expect(page.locator('.tcp-response')).toBeVisible();
    await expect.poll(() => page.locator('.tcp-response input').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).borderRadius))).toBeLessThanOrEqual(4);
    await shot(page, directory, '06-practice');

    await page.goto('/progress');
    await expect(page.getByText('整体正确率', { exact: true })).toBeVisible();
    await expectSquare(page.locator('.learning-dashboard__grid'));
    await shot(page, directory, '07-my-learning');
  });
}
