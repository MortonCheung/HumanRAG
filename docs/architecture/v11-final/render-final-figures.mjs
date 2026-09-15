/**
 * Render the three V11 freeze figures that changed after the original Archify export.
 *
 * The source JSON stays compatible with the checked-in Archify schema. This local
 * renderer keeps the final HTML, SVG and PNG deliverables reproducible on machines
 * where the Archify CLI is unavailable.
 */
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve('docs/architecture/v11-final');
const readJson = (name) => JSON.parse(readFileSync(resolve(DIR, name), 'utf8'));
const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const textWidth = (value, size = 12) => Math.max(48, [...String(value)].length * size * 0.62 + 18);

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07111e"/><stop offset="1" stop-color="#0b1727"/></linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#13273b"/><stop offset="1" stop-color="#0c1b2c"/></linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64d9c6"/></marker>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#183047" stroke-width="1" opacity=".45"/></pattern>
  </defs>`;

const shell = (title, width, height, body, subtitle) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" data-theme="dark" data-preset="blueprint">
${defs}
<title id="title">${esc(title)}</title><desc id="desc">${esc(subtitle)}</desc>
<rect width="${width}" height="${height}" fill="url(#bg)"/><rect width="${width}" height="${height}" fill="url(#grid)"/>
<circle cx="54" cy="52" r="9" fill="#64d9c6" filter="url(#glow)"/><text x="78" y="48" fill="#eff8ff" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="700">${esc(title)}</text>
<text x="78" y="72" fill="#86a2b9" font-family="Inter, system-ui, sans-serif" font-size="12" letter-spacing="1.4">${esc(subtitle)}</text>
${body}
</svg>`;

const card = (x, y, width, title, items, color) => {
  const height = 54 + items.length * 25;
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="#0b1a2a" stroke="#24435a"/>
    <circle cx="${x + 22}" cy="${y + 26}" r="5" fill="${color}"/><text x="${x + 38}" y="${y + 31}" fill="#eaf5fb" font-family="Inter, system-ui, sans-serif" font-size="15" font-weight="650">${esc(title)}</text>
    ${items.map((item, index) => `<circle cx="${x + 24}" cy="${y + 56 + index * 25}" r="2.5" fill="${color}"/><text x="${x + 38}" y="${y + 61 + index * 25}" fill="#a9c0d1" font-family="Inter, system-ui, sans-serif" font-size="12">${esc(item)}</text>`).join('')}
  </g>`;
};

function architectureSvg(spec) {
  const width = 1600;
  const height = 990;
  const ox = 72;
  const oy = 144;
  const stepX = 292;
  const stepY = 120;
  const boxes = new Map(spec.components.map((component) => {
    const [w, h] = component.size ?? [210, 84];
    return [component.id, { ...component, x: ox + component.col * stepX, y: oy + component.row * stepY, w, h }];
  }));

  const boundary = `<rect x="54" y="356" width="1484" height="396" rx="20" fill="#0d243522" stroke="#4a7894" stroke-dasharray="8 9"/><text x="76" y="382" fill="#6f9bb5" font-family="Inter, system-ui, sans-serif" font-size="12" letter-spacing="1">SPATIAL EXPERIENCE · 常驻 CANVAS</text>`;
  const connections = spec.connections.map((connection) => {
    const from = boxes.get(connection.from);
    const to = boxes.get(connection.to);
    const sx = from.x + from.w / 2;
    const sy = from.y + from.h;
    const tx = to.x + to.w / 2;
    const ty = to.y;
    const horizontal = Math.abs(tx - sx) > Math.abs(ty - sy) * 1.5;
    const startX = horizontal ? (tx > sx ? from.x + from.w : from.x) : sx;
    const startY = horizontal ? from.y + from.h / 2 : sy;
    const endX = horizontal ? (tx > sx ? to.x : to.x + to.w) : tx;
    const endY = horizontal ? to.y + to.h / 2 : ty;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const d = horizontal
      ? `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
      : `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
    const labelW = textWidth(connection.label, 10);
    return `<g opacity=".78"><path d="${d}" fill="none" stroke="#4faeaa" stroke-width="1.4" marker-end="url(#arrow)"/>
      <rect x="${midX - labelW / 2}" y="${midY - 10}" width="${labelW}" height="18" rx="8" fill="#071420" stroke="#214053"/>
      <text x="${midX}" y="${midY + 3}" text-anchor="middle" fill="#87c9c2" font-family="Inter, system-ui, sans-serif" font-size="10">${esc(connection.label)}</text></g>`;
  }).join('');

  const nodes = [...boxes.values()].map((node) => {
    const color = node.type === 'database' ? '#f0b968' : '#64d9c6';
    const fontSize = node.label.length > 25 ? 13 : 15;
    return `<g><rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="12" fill="url(#panel)" stroke="${color}" stroke-width="1.2"/>
      <rect x="${node.x}" y="${node.y}" width="5" height="${node.h}" rx="3" fill="${color}"/>
      <text x="${node.x + 20}" y="${node.y + 34}" fill="#eff8ff" font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" font-weight="650">${esc(node.label)}</text>
      <text x="${node.x + 20}" y="${node.y + 57}" fill="#8ba8ba" font-family="Inter, system-ui, sans-serif" font-size="11">${esc(node.sublabel)}</text></g>`;
  }).join('');

  const cards = spec.cards.map((item, index) => card(72 + index * 740, 790, 700, item.title, item.items, index === 0 ? '#64d9c6' : '#f0b968')).join('');
  return shell(spec.meta.title, width, height, `${boundary}${connections}${nodes}${cards}`, '最终运行时结构 · 共享空间、共享环形锚点、单一知识点工作区');
}

function sequenceSvg(spec) {
  const width = 1600;
  const height = 1210;
  const top = 128;
  const startX = 88;
  const gap = 178;
  const xs = new Map(spec.participants.map((participant, index) => [participant.id, startX + index * gap]));
  const participants = spec.participants.map((participant) => {
    const x = xs.get(participant.id);
    return `<g><rect x="${x - 70}" y="${top}" width="140" height="68" rx="10" fill="url(#panel)" stroke="#4faeaa"/>
      <text x="${x}" y="${top + 28}" text-anchor="middle" fill="#eff8ff" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="650">${esc(participant.label)}</text>
      <text x="${x}" y="${top + 49}" text-anchor="middle" fill="#86a2b9" font-family="Inter, system-ui, sans-serif" font-size="9.5">${esc(participant.sublabel ?? participant.type)}</text>
      <line x1="${x}" y1="${top + 68}" x2="${x}" y2="920" stroke="#33536a" stroke-width="1" stroke-dasharray="5 7"/></g>`;
  }).join('');
  const segmentColors = ['#64d9c6', '#69a9f2', '#f0b968'];
  const segments = spec.segments.map((segment, index) => {
    const y = segment.from + 58;
    const h = segment.to - segment.from;
    return `<g opacity=".75"><rect x="18" y="${y}" width="7" height="${h}" rx="3" fill="${segmentColors[index]}"/><text x="34" y="${y + 17}" fill="${segmentColors[index]}" font-family="Inter, system-ui, sans-serif" font-size="10" letter-spacing=".7" transform="rotate(90 34 ${y + 17})">${esc(segment.label)}</text></g>`;
  }).join('');
  const messages = spec.messages.map((message) => {
    const sx = xs.get(message.from);
    const tx = xs.get(message.to);
    const y = message.y + 58;
    const color = message.variant === 'emphasis' ? '#f0b968' : '#64d9c6';
    const labelW = Math.min(280, textWidth(message.label, 11));
    return `<g><line x1="${sx}" y1="${y}" x2="${tx}" y2="${y}" stroke="${color}" stroke-width="${message.variant === 'emphasis' ? 2 : 1.4}" marker-end="url(#arrow)"/>
      <rect x="${(sx + tx) / 2 - labelW / 2}" y="${y - 21}" width="${labelW}" height="18" rx="8" fill="#081522" stroke="#24475a"/>
      <text x="${(sx + tx) / 2}" y="${y - 8}" text-anchor="middle" fill="#c8dce8" font-family="Inter, system-ui, sans-serif" font-size="10.5">${esc(message.label)}</text></g>`;
  }).join('');
  const cards = spec.cards.map((item, index) => card(72 + index * 740, 985, 700, item.title, item.items, index === 0 ? '#64d9c6' : '#f0b968')).join('');
  return shell(spec.meta.title, width, height, `${segments}${participants}${messages}${cards}`, 'GoalTreeComposer → Reveal → Forming → Shared Ring Anchor → Handoff → Library Orbit');
}

function deltaSvg(before, after) {
  const beforeById = new Map(before.components.map((item) => [item.id, item]));
  const afterById = new Map(after.components.map((item) => [item.id, item]));
  const removed = before.components.filter((item) => !afterById.has(item.id));
  const added = after.components.filter((item) => !beforeById.has(item.id));
  const changed = after.components.filter((item) => beforeById.has(item.id) && JSON.stringify(beforeById.get(item.id)) !== JSON.stringify(item));
  const columns = [
    { title: `删除 ${removed.length}`, color: '#eb7d87', items: removed },
    { title: `收敛 ${changed.length}`, color: '#f0b968', items: changed },
    { title: `新增 ${added.length}`, color: '#64d9c6', items: added },
  ];
  const body = columns.map((column, columnIndex) => {
    const x = 72 + columnIndex * 510;
    return `<g><text x="${x}" y="142" fill="${column.color}" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="700">${column.title}</text>
      ${column.items.map((item, index) => `<g><rect x="${x}" y="${166 + index * 78}" width="468" height="61" rx="10" fill="#0c1c2c" stroke="${column.color}" stroke-opacity=".55"/><text x="${x + 18}" y="${192 + index * 78}" fill="#eff8ff" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="650">${esc(item.label)}</text><text x="${x + 18}" y="${214 + index * 78}" fill="#86a2b9" font-family="Inter, system-ui, sans-serif" font-size="10.5">${esc(item.sublabel)}</text></g>`).join('')}</g>`;
  }).join('');
  const summary = card(72, 900, 1450, '本轮结构变化', [
    'TreeOrbitLayout 成为 Goal Extraction 与 Library Preview 的共同几何来源',
    'KnowledgeTreeWorkspace 收敛为单一知识点视图，操作统一为自学、带我学、刷题',
    'Opening 与目标提取继续复用 GraphRevealPlan，并由唯一 CameraController 保持方向连续',
  ], '#64d9c6');
  return shell('HumanRAG V11 · Architecture Delta', 1600, 1090, `${body}${summary}`, '冻结版相对初始运行时结构的组件变化');
}

function writeFigure(base, svg) {
  writeFileSync(resolve(DIR, `${base}.svg`), svg);
  writeFileSync(resolve(DIR, `${base}.html`), `<!doctype html><html lang="zh-CN" data-theme="dark" data-preset="blueprint"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="generator" content="HumanRAG V11 frozen renderer"><title>${base}</title><style>html,body{margin:0;background:#07111e}body{display:grid;place-items:center;min-height:100vh}svg{display:block;width:min(100vw,1600px);height:auto}</style></head><body>${svg}</body></html>`);
}

const beforeRaw = readFileSync(resolve(DIR, 'before-runtime.architecture.json'));
const afterRaw = readFileSync(resolve(DIR, 'after-runtime.architecture.json'));
const before = JSON.parse(beforeRaw);
const after = JSON.parse(afterRaw);
const sequence = readJson('goal-extraction.sequence.json');

writeFigure('after-runtime.architecture', architectureSvg(after));
writeFigure('goal-extraction.sequence', sequenceSvg(sequence));
writeFigure('v11-final-delta', deltaSvg(before, after));

const beforeIds = new Set(before.components.map((item) => item.id));
const afterIds = new Set(after.components.map((item) => item.id));
const receipt = {
  schemaVersion: 1,
  ok: true,
  command: 'compare',
  type: 'architecture',
  comparatorVersion: 1,
  canonicalVersion: 1,
  completeness: 'complete',
  proofLevel: 'authored',
  base: { title: before.meta.title, rawSha256: hash(beforeRaw), bytes: beforeRaw.length, revision: '963070bb30fbf6abdfb77abcd9a5e6894cd80586' },
  head: { title: after.meta.title, rawSha256: hash(afterRaw), bytes: afterRaw.length },
  summary: {
    components: {
      added: [...afterIds].filter((id) => !beforeIds.has(id)).length,
      changed: after.components.filter((item) => beforeIds.has(item.id) && JSON.stringify(before.components.find((candidate) => candidate.id === item.id)) !== JSON.stringify(item)).length,
      removed: [...beforeIds].filter((id) => !afterIds.has(id)).length,
    },
    connections: { before: before.connections.length, after: after.connections.length },
    boundaries: { before: before.boundaries.length, after: after.boundaries.length },
  },
};
writeFileSync(resolve(DIR, 'v11-final-delta.receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1300 }, deviceScaleFactor: 1.5 });
for (const base of ['after-runtime.architecture', 'goal-extraction.sequence', 'v11-final-delta']) {
  await page.goto(`file://${resolve(DIR, `${base}.html`)}`, { waitUntil: 'load' });
  await page.locator('svg').screenshot({ path: resolve(DIR, `${base}.png`) });
  const stats = await page.locator('svg').evaluate((svg) => ({ text: svg.querySelectorAll('text').length, paths: svg.querySelectorAll('path').length, width: svg.getBoundingClientRect().width }));
  if (stats.text < 10 || stats.paths < 2 || stats.width < 1000) throw new Error(`${base} render self-check failed: ${JSON.stringify(stats)}`);
  console.log(`${base}: ${JSON.stringify(stats)}`);
}
await browser.close();
