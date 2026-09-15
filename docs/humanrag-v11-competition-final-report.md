# V11 Final Polish Report

- 分支：`feat/v11-humanrag-competition-final`
- 基线 HEAD：`963070bb30fbf6abdfb77abcd9a5e6894cd80586`（本轮起点）
- 施工提交：`4d5e0d4`（已推送至 `github/feat/v11-humanrag-competition-final`）
- 状态：本地施工与复核完成；**未合并、未部署**
- 施工手册：`docs/humanrag-v11-competition-final-manual.md`（61 章，本报告按第 61 章格式填写）
- 数字全部来自本机实测；门禁日志在 `output/v11-final/gates/`，截图与录屏在 `output/v11-final/`（该目录被 `.gitignore` 忽略，属运行产物，不入库）

---

## Opening

**改了什么**

- `src/scene/entryShot.ts`：入场缓动回到手册第 11 章的 `power3.out`（上一轮曾被改成 `sine.inOut`）。
- `src/scene/reveal/graphReveal.ts`：`LEVEL_GAP = 0.14`。手册写 0.19，但实测 0.19 会让 408 preset 的 Reveal 达到 2.41s，超出第 13 章要求的 1.4–1.9s；0.14 实测 1.86s / 1.44s，落在窗口内。
- `src/scene/cameraFraming.ts`：Opening 取景距离提为 `introCameraDistance()`，乘数用手册第 10 章的 3.1；上限由手册的 46 放宽到 150（实测 seed 簇半径 19.63 → 需要 60.85；46 会把最上方 seed 顶进 64px 顶栏、390px 移动端横向溢出）。
- `src/scene/BatchedKnowledgeEdges.tsx`：相位 uniform 改在 `useLayoutEffect` 写入，保证第一帧就是「完整但极暗」的 Universe，而不是一张亮线网。

**最终行为（实测）**

```text
相位：intro@0ms → awakening@174ms → settling@1227ms → universe@2321ms
入场合计：2147ms（手册第 13 章：Camera 2.15s）
第一帧：336 节点 + 全部边在场，坐标与最终帧逐点相同
变化项：只有明暗、传播、Camera
传播序：node → edge → node（边先于接收节点亮起）
```

**录屏路径**

```text
output/v11-final/screencast/route-a-opening-universe.webm   （727 KB，/ → Opening → 进入知识空间 → Universe）
output/v11-final/screencast/route-b-goal-extraction.webm    （984 KB，/universe → 生成知识树 → /library）
```

重新录制：`SCREENCAST=1 npx playwright test e2e/screencast.spec.ts`（默认跳过，约 35s）。

---

## Camera

**原 Camera ownership**：多套。Library 预览相机、知识树预览相机、目标提取各自持有一套，交接靠重建场景。

**现在 Camera ownership**：一套。任一时刻只有一个 Canvas、一个相机所有者：

```text
Universe：canvases=1  data-spatial-camera=1  data-preview-camera=0
Library ：canvases=1  data-spatial-camera=0  data-preview-camera=1
```

**最大 orientation change**

```text
入场镜头   0.00°（方向向量全程不变；target 移动，distance 60.85 → 118.01）
目标提取   0.99°（门槛 < 8°；45 个采样点里只有 2 个不同方向）
```

**本轮修复**：相机位姿此前只在 CameraControls 的 `rest` 事件上发布。入场期间 `controls.enabled === false`，`rest` 从不触发，E2E 读到的整段入场是同一个旧值（168 帧同值）——方向稳定性断言实际上是空断言。现改为逐帧发布（`CameraController` 里 CameraControls 以 priority −1 先 `update()`，本帧随后发布），并新增 `e2e/opening-entry.spec.ts` 锁定「缓慢拉开、方向不翻、落位不漂移」。该用例已用变异测试验证：把入场距离改成常量后，它以 `Expected: > 4, Received: 1` 失败。

---

## System Tree

```text
tree-408 节点数：81（全库 336；tree-ai 85 / tree-game 85 / tree-frontend 85）
```

**Universe 对齐方式**：`src/graph/canonicalSpace.ts` 的 `canonicalPosition()` / `canonicalPositionMap()`，`SPACE_SCALE = [1.22, 1.08, 1.22]` 是全站唯一坐标入口；`buildPreviewTreeGraph` 直接输出 canonical 坐标，不做二次 layout。

**坐标一致测试**：`src/features/library/scene/systemTreeGeometry.test.ts`（2 项：逐点与 Universe 同坐标；顶层节点不允许消失）。用户树仍走 `layoutCustomTree`，未受影响。

---

## Goal Extraction

**Reveal 方式**：与 Opening 共用同一个确定性纯函数 `buildGraphRevealPlan`，传播从 `GoalTreeComposer.seedPointIds` 出发，不重新猜 seed；`node → edge → node` 的 BFS 顺序固定可复现。

**阶段时间（实测，ms）**

```text
highlighting 714 → detaching 375 → receding 325 → forming 833 → connecting 270
合计 2517ms
```

**性能数据**

```text
Canvas count = 1
CameraControls owner = 1
空闲刷新：30 / 24 / 18 fps（按画质档，非 60fps 常驻 setInterval）
Opening 入场：软件渲染下 2.54s / 83 帧 = 32.7fps，>100ms 长间隔 3 次
```

说明：本机 Chromium 是 SwiftShader 软件渲染，**上列帧率不能代表真实 GPU**。

**Camera 数据**：提取全程最大方向变化 0.99°，`enabled` 在提取期间为 `false`，`pointerdown / wheel` 在捕获阶段被拦截，用户抢不走相机。

**本轮修掉的一个真实缺陷：同一个目标整理第二次必定失败。** `GoalTreeComposer` 的树名与范围是确定性的，第二次生成会撞上 `createTree` 的同名校验，抛出「这个知识库中已经有同名知识树」，而抽屉只显示通用错误文案，用户看到的是「失败」而不是同一棵树——评审随手再点一次就会踩到。修法是把「落到哪棵树上」抽成 `resolveGoalTreeTarget()`：同名同范围直接复用已有树；同名但范围不同时保留旧树、用同前缀的空名新建，任何情况下都不再因为重名中断提取。

断言位置：`src/domain/knowledge/migration.test.ts`（`resolveGoalTreeTarget` 4 项）+ `e2e/goal-tree-composition.spec.ts`「同一个目标重复整理复用同一棵树，不会失败」。

---

## Navigation

四个宽度实测（`#context-nav-title` 居中偏差为 0，主操作完整落在导航栏内）：

```text
 390 × 844   nav=[0,0,390,56]    title offset 0px   primary=[334, 6,44,44]    actions hidden, display:none
 768 × 1024  nav=[0,0,768,64]    title offset 0px   primary=[708,10,44,44]    actions hidden, display:none
1024 × 768   nav=[0,0,1024,64]   title offset 0px   primary=[964,10,44,44]    actions hidden, display:none
1440 × 900   nav=[0,0,1440,64]   title offset 0px   primary=[1364,10,44,44]   actions hidden, display:none
```

按钮 bounding box 见上（`primary` 为 `[left, top, width, height]`）；任何宽度下 `primaryInsideNav = true`，主按钮没有被卡掉。断言位置：`e2e/navigation-anchors.spec.ts`。

---

## Copy

**删除的主要模板文案**：「沿知识关系前进」一类不影响下一步的说明性文案；目标树描述不再使用模板腔。

**替换术语**

```text
学习路径 → 学习          （TreeLocalNav）
能力验证 → 测验          （TreeLocalNav）
全局回退标题统一为：知识库 / 学习记录 / 知识空间
目标树描述：根据"<原始输入>"整理，共 N 个知识点。
```

本轮另外确认：`e2e/learning-workspaces.spec.ts` 里「建议先学 …」类 selector 失败是**并发抖动**而非文案回归（源码文案完好，单独跑 3.5s 通过），按手册要求未改回旧文案；本轮已把 E2E 串行化，这类抖动不再出现（见 Tests 章）。

---

## Morphicons

**接入位置**（仅两处，未扩散）

```text
src/components/navigation/FullscreenButton.tsx   全屏 ⇄ 退出全屏
src/features/knowledge-tree/components/PointGroup.tsx  折叠 ⇄ 展开
```

**bundle 差异**（用桩模块做 A/B 构建实测）

```text
index chunk：Morphicons 贡献 +18.32 kB raw / +7.94 kB gzip
             （当前 index 为 495.90 kB / gzip 159.35 kB）
spatial-runtime：1,091.51 kB / gzip 302.09 kB（无变化）
```

即 Morphicons 的实际代价是 **+18.32 kB raw / +7.94 kB gzip**，且已被 tree-shake 到只留用到的图标。

---

## Archify

目录：`docs/architecture/v11-final/`（配套导出脚本 `export-figures.mjs`，把 render 出的 HTML 里的内联 SVG/CSS 与 `data-theme` 一起抽成可独立打开的 `.svg`/`.png`）

```text
Before Architecture   before-runtime.architecture.{json,html,svg,png}
                      9/9 检查，showcase 0 error / 0 warning
After Architecture    after-runtime.architecture.{json,html,svg,png}
                      9/9 检查，showcase 0 error / 0 warning
Opening Sequence      opening-universe.sequence.{json,html,svg,png}
                      9 参与者（与手册第 48 章逐项一致），9/9 showcase
Extraction Sequence   goal-extraction.sequence.{json,html,svg,png}
                      9 参与者（含独立 CameraController 泳道），9/9 showcase
Delta                 v11-final-delta.html + v11-final-delta.receipt.json
                      28/28 检查，base/head composition pass
```

Delta 差异：组件新增 6 / 变更 3 / 移除 6 / 证据变更 5；连接变更 9；边界变更 1。对应手册要表达的四处结构变化：新增 `CanonicalSpace`、`GraphRevealPlan`；相机所有者由「多套」收敛为「一套」；系统树布局由 custom relayout 改为 canonical；Opening 由「临时子图」改为「完整图 + 传播状态」。

产物 sha256 前缀：

```text
514fbe8441a5d0831b3af981  after-runtime.architecture.html
80f4bd00b05e4b27e5d38b40  before-runtime.architecture.html
e8b9dec31406a259aa9396cd  opening-universe.sequence.html
4fbfe5720766310d51c87fc0  goal-extraction.sequence.html
1defeabac3913a4995ada107  v11-final-delta.html
105e5c5c3cb45e657c311976  v11-final-delta.receipt.json
```

---

## Tests

```text
typecheck：通过（tsc -b，0 错误）
unit     ：43 个文件 / 230 项全部通过
build    ：通过；spatial-runtime 1,091.51 kB（gzip 302.09 kB）、index 495.90 kB（gzip 159.35 kB）
e2e      ：49 项 = 48 通过 + 1 跳过（screencast 录制，默认 skip），串行执行，0 失败
```

本轮新增/收紧：

```text
src/scene/reveal/graphReveal.test.ts   每个 preset 的 Reveal 时长都落在 1.4–1.9s
src/scene/cameraFraming.test.ts        Opening 取景距离不被上限截断；seed 不压顶栏
src/domain/knowledge/migration.test.ts resolveGoalTreeTarget：复用同名同范围 / 同名不同范围去重（4 项）
e2e/opening-entry.spec.ts              入场镜头：相位序列 + 时长、距离单调拉开、方向不翻、落位不漂移
e2e/goal-tree-composition.spec.ts      同一目标重复整理复用同一棵树，不再失败
e2e/visual-acceptance.spec.ts          提取相位截图改为「每个相位单独跑一遍，只抓一帧」
e2e/screencast.spec.ts                 走查录屏（SCREENCAST=1 才跑，默认 skip）
```

**本轮修掉的两处「测试本身不可靠」**

1. 相机位姿此前只在 `rest` 事件上发布。入场期间 `controls.enabled === false`，`rest` 永不触发，E2E 读到的整段入场是同一个旧值（168 帧同值）——方向稳定性断言实际上是空断言。现改为逐帧发布（见 Camera 章）。
2. `opening-entry` 的拉开幅度原本拿「入场后第一帧」当基线，而第一帧落在哪一刻取决于主线程负载：同一份正确实现实测会读到 60.85 或 78.9，比值 1.94 / 1.50 恰好跨过阈值，于是随机失败。现改为安装探针时**同步**抓一帧 seed 位姿（点击之前），并取整段轨迹的 min/max，比值稳定在 1.9 附近。

**E2E 串行化**：`playwright.config.ts` 的 `workers` 由「仅 CI 为 1」改为**恒为 1**。原因是渲染走 SwiftShader 软件光栅，而知识树预览是常驻自转的 WebGL 场景，并发会把 CPU 打满，`mouse.move` / `page.evaluate` 这类 CDP 指令在 30s 内排不上渲染主线程。本机实测 2 worker / 4 worker 都会在 `readonly-preview`（verify）与 `responsive`（mobile）上偶发 30s 超时；这两条用例单独跑均通过（同样约 3–4s），确认是并发负载而非产品行为。串行后 `npm run test:e2e` 全绿且可复现。

---

## Remaining

1. **Archify 时序图的参与者上限是 9，这是结构性上限，不是偷懒。** 手册第 49 章列了 11 个参与者。Archify 的约束是：布局要求 `viewBox[0] ≥ 188 + (N−1) × 108`（盒宽下限 86px、列距下限 108px），而 1440px 视图下的可读性门要求 `viewBox[0] ≤ 930 × 7 / 6 = 1085`。两式相交得 `N ≤ 9`（N=9 需 1052–1085，N=10 需 ≥1160，N=11 需 ≥1268，均不可行）。因此 `BatchedKnowledgeEdges` 与 `Domain Registry` 无法进同一张图，已写入图内卡片说明；`CameraController` 作为手册最强调的不变式，替换成独立泳道。
2. **平台与真实 GPU 未实机验收**：Windows / Safari / 真机触屏；本机是 SwiftShader 软件渲染，帧率数据不能外推。
3. **E2E 改为串行执行（`workers: 1`）。** 根因是软件光栅 + 知识树预览常驻自转的 WebGL 场景：并发会把 CPU 打满，导致 CDP 指令（`mouse.move` / `page.evaluate`）排不上渲染主线程而 30s 超时。已用串行配置消除；**根因本身（软件渲染代价）保留**，真实 GPU 上不构成问题。
4. **上游告警**：`lottie-web` 使用 `eval`，属上游问题，本轮未处理。
5. **分支状态**：未合并、未部署；按手册要求全程未 rebase / reset / amend / force-push，本轮改动为纯追加提交。
