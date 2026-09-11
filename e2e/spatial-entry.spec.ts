import { expect, test } from '@playwright/test';

test('开场保留同一个场景、导航和操作入口，进入后没有路由交接', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const canvas = page.locator('.spatial-canvas-layer canvas');
  await expect(canvas).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.it-landing__copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('header.context-nav')).toHaveCount(1);
  await expect(page.getByRole('banner')).toHaveCount(0);
  await expect(page.locator('#landing-title')).toBeInViewport();
  await expect(page.getByRole('button', { name: '进入知识空间' })).toBeInViewport();
  const before = await page.evaluateHandle(() => ({
    canvas: document.querySelector('canvas'),
    nav: document.querySelector('header.context-nav'),
    workspace: document.getElementById('knowledge-field-app'),
  }));
  await page.screenshot({ path: 'output/playwright/v11-opening-1440.png' });
  await page.getByRole('button', { name: '进入知识空间' }).click();
  await expect(page.locator('.spatial-experience--universe')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(await before.evaluate((previous) => ({
    canvas: previous.canvas === document.querySelector('canvas'),
    nav: previous.nav === document.querySelector('header.context-nav'),
    workspace: previous.workspace === document.getElementById('knowledge-field-app'),
  }))).toEqual({ canvas: true, nav: true, workspace: true });
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('banner')).toBeFocused();
  await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '视图复位' })).toBeVisible();
  await page.screenshot({ path: 'output/playwright/v11-universe-1440.png' });
});

test('低动态模式直接显示已准备好的最终空间', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 12_000 });
  await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: '进入知识空间' })).toBeInViewport();
  await page.screenshot({ path: 'output/playwright/v11-opening-390.png' });
  await page.getByRole('button', { name: '进入知识空间' }).click();
  await expect(page.locator('.spatial-experience--universe')).toBeVisible();
  await expect(page.getByRole('button', { name: /跳过动画/ })).toHaveCount(0);
  await expect(page.getByRole('banner')).toBeVisible();
  await page.screenshot({ path: 'output/playwright/v11-universe-390.png' });
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px：切换节点保留详情外壳并居中于有效视区`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/universe');
    await expect(page.locator('.spatial-experience')).toHaveAttribute('aria-busy', 'false');
    const panel = page.locator('.node-inspector.is-expanded');
    let shell: Awaited<ReturnType<typeof page.evaluateHandle>> | undefined;
    for (const name of ['线性表', 'TCP可靠传输', '线性表']) {
      await page.keyboard.press('/');
      await page.getByRole('textbox', { name: '搜索输入' }).fill(name);
      await page.locator('.command-result').filter({ has: page.getByText(name, { exact: true }) }).first().click();
      await expect(panel.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
      if (!shell) shell = await panel.evaluateHandle((element) => element);
      else expect(await shell.evaluate((element) => element === document.querySelector('.node-inspector.is-expanded'))).toBe(true);
      // Labels are anchored directly above the real node. With no camera roll their
      // horizontal centre is the node's projected centre, independent of font size.
      await expect.poll(async () => {
        const bounds = await panel.boundingBox();
        const label = await page.locator('.node-label--selected').boundingBox();
        if (!bounds || !label) return Infinity;
        const expectedX = bounds.width >= viewport.width * 0.65 ? viewport.width / 2 : bounds.x / 2;
        return Math.abs(label.x + label.width / 2 - expectedX);
      }, { timeout: 5000 }).toBeLessThan(8);
    }
    await page.screenshot({ path: `output/playwright/v11-node-focus-${viewport.width}.png` });
    await panel.getByRole('button', { name: '关闭节点详情' }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator('.node-label--selected')).toHaveCount(0);
  });
}
