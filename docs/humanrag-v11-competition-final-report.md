# HumanRAG V11 比赛最终冻结报告

- 分支：`feat/v11-humanrag-competition-final`
- 冻结基线：`4d5e0d45e11661518a454db173fb1083c5a96fdf`
- 报告日期：2026-09-15
- 状态：A–D 四批施工与本地验收完成；未合并、未部署
- 冻结提交：本报告所在提交

本轮只完成 Opening 与视角修复、目标提取到 Library 的连续空间、Knowledge Tree 信息架构减法，以及 UI 与交付收口。未改 canonical space、Learning Engine、AI 能力或 3D renderer。

## A. Opening 与 Universe 视角

### 最终行为

- Opening 第一帧保留完整 Universe 对象和 canonical 坐标，普通边透明度降到近黑场，只有 seed 节点与 seed 边明确可见。
- Awakening 继续按 `node → edge → node` 的确定性传播顺序苏醒；进入 Universe 后一次恢复完整边亮度。
- 从 Overview 打开节点再关闭会回到 Overview。
- 从 Goal 视角打开节点再关闭会回到原 Goal；连续查看多个节点也不会覆盖最初上下文。
- 节点聚焦期间不把临时分支写入持久化目标状态。

### 自动证据

- `src/scene/BatchedKnowledgeEdges.test.ts` 覆盖 Opening 普通边、seed 边和 Universe 亮度。
- `src/store/knowledgeStore.test.ts` 覆盖 Overview / Goal / 连续节点的恢复与持久化边界。
- `e2e/opening-entry.spec.ts` 覆盖入场距离、方向连续和落位稳定。

## B. HumanRAG 到 Library 连续空间

### 最终行为

- `GoalTreeComposer` 只选择 Registry 中已有知识点，生成普通用户 KnowledgeTree。
- Reveal 使用已有传播计划；Forming 按节点延迟错峰移动到目标位置。
- 目标提取与 Library Preview 共用 `TreeOrbitLayout` 计算的确定性三维环形锚点。
- 1、2、3、4、5、8 棵树都能形成稳定环；树数量变化时所有树平滑调整位置，每棵树继续慢速自转。
- 数据和画面同时 Ready 后停稳 220ms，再由同一 Canvas 移交到 Library；移交窗口为 620ms，并保留目标树旋转状态。

### 自动证据

- `src/features/library/scene/treePreviewLayout.test.ts` 覆盖多种树数量的环形位置。
- `src/scene/NodePointField.test.ts` 覆盖错峰、抬升和最终位置。
- `e2e/goal-tree-composition.spec.ts` 覆盖 Ready 停稳、路由状态、同一 Canvas 和普通用户树落库。
- `e2e/goal-extraction-camera.spec.ts` 覆盖提取期间相机方向与交互锁定。

## C. Knowledge Tree 信息架构

### 最终行为

- 知识树使用态只显示“知识点”，不再显示“学习 / 测验”切换。
- 节点详情只提供三个并列动作：`自学 / 带我学 / 刷题`。
- `/path` 是知识树唯一使用态入口；旧树级 `/verify`、`/learn` 与 `/practice` 地址兼容回到 `/path`，已有练习 session 仍可继续完成。
- 从学习或练习返回知识树时继续聚焦原知识点。
- 编辑能力仍只对用户树提供，并继续按需加载。

### 删除内容

- `TreeLocalNav.tsx`
- `TreeVerificationPanel.tsx`
- 对应旧模式样式与路由分支

## D. UI 与文案

- 应用菜单使用 `ChevronDown ⇄ ChevronUp` Morph。
- 页面操作菜单使用 `MoreHorizontal ⇄ X` Morph。
- 保留既有 Fullscreen 与 PointGroup Morph，没有给搜索增加额外 Morph。
- 目标提取的所有可见阶段统一为 `正在整理…`，状态机仍通过 `data-extraction-phase` 保留可测试语义。
- 删除目标抽屉提示和 Library 的“选择预览”。
- “为什么建议从这里继续”收口为“建议”，理由和教学信息继续保留。
- 系统树导航只显示“只读”。

## Architecture

目录：`docs/architecture/v11-final/`

- `after-runtime.architecture.{json,html,svg,png}`：最终运行时结构，明确 `TreeOrbitLayout` 被 Goal Extraction 与 Library Preview 共同使用。
- `goal-extraction.sequence.{json,html,svg,png}`：明确 `GoalTreeComposer → Reveal → Forming → Shared Ring Anchor → Handoff → Library Orbit`。
- `v11-final-delta.{html,svg,png}` 与 `v11-final-delta.receipt.json`：最终结构差异与可机读回执。
- Opening Sequence 未改；本轮只调整 Shader 状态，没有改变其结构。
- `render-final-figures.mjs` 可从源 JSON 重建本轮三组 HTML、SVG、PNG 和 Delta 回执。

当前本机没有 Archify CLI，因此最终三组可视产物由仓库内的确定性渲染脚本生成；架构与时序源 JSON 继续使用现有 Archify schema。渲染脚本自检每张图的 SVG 尺寸、文本和路径数量，三张 PNG 另经人工查看，无截断或空白。

## 自动门禁

```text
npm run typecheck  通过，0 错误
npm test           44 个文件 / 240 项通过
npm run build      通过
npm run test:e2e   49 项：48 通过 / 1 按设计跳过 / 0 失败
```

生产构建体积：

```text
index              497.18 kB / gzip 159.21 kB
spatial-runtime  1,091.51 kB / gzip 302.10 kB
```

构建仍会报告 `lottie-web` 使用 `eval` 的上游提示；它没有阻断构建，本轮没有扩大该依赖的使用范围。

## 五条人工验收

1. **Opening**：第一帧接近黑场，seed 明显，未出现完整灰色蛛网；中间帧能读出节点与边的传播。
2. **Universe Node**：Overview 查看节点后回到 Overview；Goal 查看节点后回到原 Goal，相机平滑恢复。
3. **HumanRAG**：相关节点增强、无关节点后退、旧关系断开、节点错峰成树、停稳后连续进入 Library。
4. **Library**：四棵系统树与新增个人树使用同一三维环；选树和新增树都会平滑重排，树保持自转。
5. **Knowledge Tree**：页面只显示“知识点”；节点详情的“自学 / 带我学 / 刷题”均可进入对应工作区。

可重复视觉证据位于 `output/v11-final/visual-acceptance/`，包括 15 张桌面关键画面与 9 张移动端画面。该目录是本地运行产物，不纳入 Git。

## 冻结边界

从本报告所在提交开始，产品代码冻结。之后只接受：阻断比赛演示的 Bug、构建或部署失败、严重视觉破坏、数据丢失。后续工作限定为视频、截图、答辩文档、部署和提交。

尚未完成正式部署，以及 Windows、Safari、真实触屏设备和真实 GPU 的实机验收；这些项目不计入本地完成声明。
