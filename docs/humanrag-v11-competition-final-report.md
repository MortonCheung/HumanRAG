# HumanRAG V11 比赛最终收口报告

- 分支：`feat/v11-humanrag-competition-final`
- 基线 HEAD：`963070bb30fbf6abdfb77abcd9a5e6894cd80586`
- 状态：本地施工与验收完成；**未合并、未推送、未部署**。
- 施工手册：`humanrag-v11-final-spec`（61 章）。本报告对应第 47–61 章的收口结果。

结论：收口目标全部达成，四道门禁全绿；仅剩需要实机验证的项（Windows / Safari / 真机触屏）与上游警告。

---

## 1. Opening：第一帧就是完整 Universe

- **不存在临时小树/临时星座几何。** `buildIntroScene` 只改写亮度与传播字段，节点与边的数量、坐标原封不动：
  - 结构不变：`intro.nodes.length === model.nodes.length`，`intro.edges.length === model.edges.length`
  - 坐标不变：每个节点 `node.displayPosition` 与模型逐点相等
  - 只有明暗/传播在动：seed 为 `lensActive` 且 `propagationDelay === 0`，其余按图距离取延迟
  - 断言位置：`src/scene/intro/constellationPresets.test.ts`「intro scene 保留全部节点，坐标原封不动」
- **传播引擎唯一。** Opening 与目标提取共用同一个确定性纯函数 `buildGraphRevealPlan`（`src/scene/reveal/graphReveal.ts`）：从 seed 出发按 `node → edge → node` 做 BFS，边先于接收节点亮起，排序固定、可复现。
  - 断言位置：`src/scene/reveal/graphReveal.test.ts`（6 项：确定性、seed 从 0 开始、接收节点不早于传播边、允许集合外不亮、单调性、duration 覆盖）
- **seed 选择稳定。** `pickOpeningPreset` 在 session 内按顺序轮换（不是 `Math.random`），且每个 preset 的 seed 都是真实存在的节点。
- **状态机**：`intro → awakening → settling → universe`；唤醒期由 `createEntryShot` 驱动入场镜头，落定后才交接到 `universe`。

## 2. Camera：全站唯一所有者

- **所有权互斥。** `SpatialSceneRouter` 在 `library / tree` 模式提前返回只渲染预览场景，在 `universe / opening` 模式只渲染 `CameraController` —— 任一时刻只挂载一套 `CameraControls`。
  - 断言位置：`e2e/spatial-stage.spec.ts`「同一时刻只有一个相机所有者」（Universe 只有 `data-spatial-camera`，Library 只有 `data-preview-camera`，两者不共存，共享 Canvas 在交接前后是同一个）
- **Opening 相机去找 seed，而不是节点飞向相机。** `intro` 阶段以 seed 簇的包围球为对象 `setLookAt`。
- **目标提取期间用户抢不走相机。** `enabled={experiencePhase === 'universe' && !extractionFrame?.active}`，并在 `pointerdown / wheel` 捕获阶段拦截；只沿**当前视角方向**重新构图（`frameSphereAlongView`），不转向。
  - 断言位置：`e2e/goal-extraction-camera.spec.ts`（提取全程方向偏差 < 8°，最终 `[data-spatial-stage] canvas` 仍为 1）
- **删除了目标提取的第二套 CameraControls**：提取在共享 Canvas 内由 `GoalTreeExtraction` 完成，不再另起一套相机/画布。
- `CameraController` 通过 `gl.domElement.dataset.spatialCamera` 发布位姿，供 E2E 在不读 React 状态、不读 WebGL 场景图的前提下验证方向稳定性。
- 入场镜头角度门槛收紧：`src/scene/entryShot.test.ts` 中段夹角 < 0.5°。

## 3. System Tree：复用 Universe 的 canonical 坐标

- **唯一坐标定义**：`src/graph/canonicalSpace.ts` → `SPACE_SCALE = [1.22, 1.08, 1.22]`，`canonicalPosition()` / `canonicalPositionMap()` 是全站唯一入口。
- **系统树不重新 layout**：`buildPreviewTreeGraph` 直接输出 `canonicalPosition(point.position)`，系统树与 Universe 逐点同坐标。
  - 断言位置：`src/features/library/scene/systemTreeGeometry.test.ts`「tree-408 与 Universe 使用同一套节点坐标」+「顶层节点不允许消失」
- **用户树仍允许 custom layout**；系统树与用户树共用同一套 `LearningWorkspace / PracticeWorkspace`，不复制页面。

## 4. Goal Extraction：一条确定性链路

`自然语言 → seedPointIds + pointIds → reveal → detach → recede → custom layout → connect → persist → handoff`

- `GoalTreeComposer` 只从 Registry 里选已有节点（名称/标签/描述/内容线索确定性评分），输出带逐点理由的子图，**不生成新知识点**。
- `buildGraphRevealPlan(model, seedPointIds, allowedNodeIds)` 生成提取期唤醒顺序。
- `GoalTreeExtraction` 在同一场景内执行 detach（旧边从中间向两端断开）、recede（无关节点表现层退场）、custom layout 聚合、双端建边。
- 结果持久化在 `goalTreeTransitionStore`，刷新可恢复；最终交接到 `LibraryPreviewUniverseScene`，复用同一 Canvas。
- 时序图见 `docs/architecture/v11-final/goal-extraction.sequence.html`。

## 5. Navigation：左中右锚定

- 三个槽位固定：`#context-nav-primary`（主操作）、`#context-nav-title`（标题，真居中）、`#context-nav-actions`（次要操作）。
- **次要操作在任何宽度都收进 `...`**（`aria-label="页面操作"`，`aria-controls="context-nav-actions"`）。本轮修复的关键点：`hidden={!actionsOpen}`（此前误写为 `!wide && !actionsOpen`，导致桌面端次要操作常驻展开并以 absolute 悬浮，压住导航）。
- 焦点不会被困在 `hidden` 面板里：关闭时焦点回到触发按钮。
- 断言位置：`e2e/navigation-anchors.spec.ts`（390 / 768 / 1024 / 1440 四个宽度：主按钮完整落在导航栏内、标题居中偏差 < 3px、`#context-nav-actions` 默认隐藏、展开后可见「创建知识树 / 测验」）。

## 6. Copy：说人话

- 知识树页内导航：`学习路径 → 学习`、`能力验证 → 测验`（`TreeLocalNav.tsx`）。
- 全局回退标题：`知识库 / 学习记录 / 知识空间`（`GlobalNav.tsx`）。
- 删除「沿知识关系前进」一类不影响下一步的说明性废话。

## 7. Morphicons：只接两处

- `src/components/navigation/FullscreenButton.tsx`：`Maximize2 ⇄ Minimize2`（全屏切换）。
- `src/features/knowledge-tree/components/PointGroup.tsx`：`ChevronRight ⇄ ChevronDown`（目录折叠）。
- 其余位置不使用 Morphicon，避免为装饰增加动效负担。

## 8. Archify：五份图

目录：`docs/architecture/v11-final/`

| 图 | 文件 | 校验 |
| --- | --- | --- |
| Before 架构 | `before-runtime.architecture.json` + `before-runtime.html` | 通过 |
| After 架构（14 组件） | `after-runtime.architecture.json` + `after-runtime.architecture.html` | 9/9 检查，showcase 0 error / 0 warning |
| Opening → Universe 时序（9 参与者） | `opening-universe.sequence.json` + `.html` | 9/9，showcase pass |
| 目标提取 → 知识树时序（9 参与者） | `goal-extraction.sequence.json` + `.html` | 9/9，showcase pass |
| Architecture Delta | `delta-runtime.html` + `delta-runtime.receipt.json` | 28/28，base/head composition pass |

Delta 关键差异（compare before → after）：

- 组件：新增 6、变更 3、移除 6、证据变更 5
- 连接：变更 9
- 边界：`Spatial Experience 常驻 Canvas` 作用域变更 1

对应手册要表达的四处结构性变化：新增 `CanonicalSpace` / `GraphRevealPlan`；相机所有者由「多套」收敛为「一套」；系统树布局由 custom 改为 canonical；Opening 由「临时星座」改为「完整 Universe + 传播」。

产物 sha256 前缀：

```
514fbe8441a5d0831b3af981  after-runtime.architecture.html
e8b9dec31406a259aa9396cd  opening-universe.sequence.html
9f85b6b5862b41e8236e533d  goal-extraction.sequence.html
1defeabac3913a4995ada107  delta-runtime.html
80f4bd00b05e4b27e5d38b40  before-runtime.html
```

## 9. Tests：四道门禁全绿

| 门禁 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run typecheck` | 通过 |
| 单测 | `npm test` | **43 个文件 / 222 项全部通过** |
| 构建 | `npm run build` | 通过；`spatial-runtime` 1,091.51 kB（gzip 302.09 kB） |
| E2E | `npm run test:e2e` | **46 项全部通过**（约 2.2 分钟） |

日志：`output/v11-competition-final/{typecheck,unit,build,e2e}.log`

本轮新增/收紧的检查：

- `src/scene/reveal/graphReveal.test.ts`（6 项，传播引擎纯函数）
- `src/features/library/scene/systemTreeGeometry.test.ts`（2 项，canonical 复用）
- `src/scene/entryShot.test.ts`（中段夹角收紧到 0.5°）
- `e2e/navigation-anchors.spec.ts`（4 个宽度，导航锚定 + `...` 收纳）
- `e2e/readonly-preview.spec.ts`（path / verify 下树可转、相机不动、选择不变）
- `e2e/goal-extraction-camera.spec.ts`（提取期间一套相机、方向不翻）
- `e2e/spatial-stage.spec.ts`（新增「同一时刻只有一个相机所有者」）

E2E 适配：第 30 章把次要操作收进 `...` 后，所有依赖次要操作的用例统一走 `e2e/helpers.ts` 的 `openPageActions / expectPageAction / clickPageAction`。

## 10. Remaining：仍未覆盖的部分

- **平台与真实 GPU**：Windows、Safari、真实触屏设备未实机验收。本机 Chromium 为软件渲染（SwiftShader），**不能证明真实 GPU 的帧时间与触摸手势表现**。
- **性能档位**：脉冲数量与 idle 刷新档（16/9/5 条，30/24/18fps）由 `qualityPolicy.test.ts` / `BatchedKnowledgeEdges.test.ts` 在策略层锁定，实机帧率仍需上机确认。
- **上游警告**：`lottie-web` 的 `eval` 使用告警为上游问题，未在本轮修复。
- **分支状态**：`feat/v11-humanrag-competition-final` 未合并、未推送、未部署；按手册要求不重写历史。
- **可继续打磨**：Archify 时序图因 1440×900 的可读性下限受限于 9 个参与者，`CameraController` 已并入卡片说明而非独立泳道；如需独立泳道应拆成两张图。
