/**
 * 从 Archify 渲染出的 HTML 里导出配套的 .svg / .png（`archify render` 只产出 HTML）。
 *
 * 两个必须做的处理，否则导出的 SVG 会丢主题、丢配色：
 *   1. 用 `?theme=dark` 打开，headless Chromium 默认是 data-theme=light；
 *   2. 把 <html> 上的 data-theme / data-preset 复制到 SVG 根节点，
 *      并把文档内联 CSS 一起塞进 SVG——它们都靠 [data-theme] 选择器生效。
 *
 * 用法：node docs/architecture/v11-final/export-figures.mjs
 * 先执行：archify render <type> <input.json> <output.html> --quality showcase
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

mkdirSync('output/v11-final/figures', { recursive: true });

const D = resolve('docs/architecture/v11-final');
const targets = [
  ['before-runtime.architecture.html', 'before-runtime.architecture'],
  ['after-runtime.architecture.html', 'after-runtime.architecture'],
  ['opening-universe.sequence.html', 'opening-universe.sequence'],
  ['goal-extraction.sequence.html', 'goal-extraction.sequence'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

for (const [html, base] of targets) {
  await page.goto(`file://${resolve(D, html)}?theme=dark`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  // 抽取内联 SVG，并把文档里的 CSS 一并内联，保证导出的 .svg 脱离 HTML 仍能正确着色。
  const svg = await page.locator('svg').first().evaluate((el) => {
    const clone = el.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    // 主题属性在 <html> 上，必须复制到 SVG 根节点，否则内联 CSS 的 [data-theme] 规则不生效。
    for (const attr of ['data-theme', 'data-preset']) {
      const value = document.documentElement.getAttribute(attr);
      if (value) clone.setAttribute(attr, value);
    }
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join('\n');
    if (css.trim()) {
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = css;
      clone.insertBefore(style, clone.firstChild);
    }
    return clone.outerHTML;
  });
  writeFileSync(resolve(D, `${base}.svg`), svg);

  await page.locator('svg').first().screenshot({ path: resolve(D, `${base}.png`) });
  console.log(`${base}: theme=${theme} svgBytes=${svg.length} htmlBytes=${readFileSync(resolve(D, html)).length}`);
}

// 自检：把导出的 svg 当独立文件重新打开并截图，确认不是空白/丢色。
const check = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
for (const [, base] of targets) {
  await check.goto(`file://${resolve(D, `${base}.svg`)}`, { waitUntil: 'load' });
  await check.waitForTimeout(900);
  const stat = await check.evaluate(() => {
    const svgEl = document.querySelector('svg');
    if (!svgEl) return { ok: false };
    const box = svgEl.getBoundingClientRect();
    const colored = [...svgEl.querySelectorAll('*')].filter((n) => {
      const f = getComputedStyle(n).fill;
      return f && f !== 'none' && !f.startsWith('rgb(0, 0, 0)') && f !== 'rgba(0, 0, 0, 0)';
    }).length;
    const texts = svgEl.querySelectorAll('text').length;
    return { ok: true, w: Math.round(box.width), h: Math.round(box.height), colored, texts };
  });
  console.log(`selfcheck ${base}: ${JSON.stringify(stat)}`);
  await check.screenshot({ path: `output/v11-final/figures/svgcheck-${base}.png` });
}
await browser.close();
