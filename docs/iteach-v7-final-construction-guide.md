# iTeach V7 最终施工图纸与执行指南

> 文档性质：最终施工说明书，不是灵感提案，也不是提示词。  
> 项目路径：`/Users/morton_cheung/Desktop/AI/iTeach`  
> 适用对象：第一次接触本项目、甚至不熟悉前端开发的执行者。  
> 最终目标：一次完成可参赛展示的静态 Web 产品，后续只做内容和视觉微调。  
> 本文状态：基于 2026-08-31 当前工作区编写。当前工作区含大量未提交改动，施工前必须先完成第 1 章的基线验证。

---

## 0. 如何使用这份图纸

### 0.1 唯一施工原则

严格按“数据正确 → 状态正确 → 功能闭环 → 交互正确 → 性能稳定 → 视觉收敛”的顺序施工。

禁止在前一批次没有通过验收时跳到下一批次。特别禁止：

- 为了赶进度跳过题目判定与教学状态机测试。
- 一边改数据结构，一边重做页面视觉。
- 在同一个元素上混用 Motion、GSAP、Anime.js。
- 因为 Windows 卡顿就直接删除核心关系或节点。
- 用新增粒子、光效、渐变掩盖布局和交互问题。
- 删除当前工作区中的未知文件或使用 `git reset --hard`、`git clean`。

### 0.2 每个施工批次的固定动作

进入项目目录：

```bash
cd /Users/morton_cheung/Desktop/AI/iTeach
```

开始前查看当前状态：

```bash
git status --short
```

每完成一个批次，按顺序运行：

```bash
npm run typecheck
npm test
npm run build
```

三个命令全部通过，才允许进入下一批次。

### 0.3 施工最终停止条件

满足以下全部条件才算完成：

1. 开屏、知识空间、教学、刷题、知识库、创建知识库、学习记录全部可直接访问。
2. 336 个系统节点均可悬停和点击，646 条关系能正确显示。
3. 点击任意中间层节点时，上游与下游完整链路同时点亮。
4. 用户在节点选中后仍可自由旋转、平移和缩放。
5. 系统能诊断、讲解、示范、练习、纠错、复教和再次检测。
6. 刷题结果会回写错因与掌握度，并可跳转到对应教学。
7. 用户创建的知识库能生成可执行教学和题目，不只是保存节点 ID。
8. 刷新页面后，个人知识库、教学会话和刷题会话不会无故丢失。
9. 390、768、1366、1440、1920 像素宽度下没有遮挡、横向溢出或无法操作的面板。
10. Windows 集显默认使用均衡或性能模式，核心交互不卡死。
11. 单元测试、生产构建、评委核心流程 E2E 全部通过。
12. 浏览器控制台无 Error，深层路由刷新不出现 404。

---

# 1. 当前工程基线与保护措施

## 1.1 当前已经存在的能力

当前项目不是空项目。施工人员不得重新搭建一套平行系统。

已经存在：

- React 19、Vite、TypeScript。
- React Three Fiber、Three.js、Drei、后处理。
- Motion、GSAP、Anime.js、Lottie Web。
- Zustand、Graphology、Zod。
- Phosphor 图标。
- 336 个计算机知识节点、646 条关系。
- 4 个计算机学习方向：考研 408、AI 工程、游戏开发、前端开发。
- 三维节点批量渲染、曲线关系、Camera Controls、质量分级。
- 多路由产品骨架。
- 教学、刷题、知识库、学习记录的静态数据与初版页面。
- 48 个大学课程模板、24 个学习者画像、数千道确定性演示题。
- 本地 Lottie 完成动画。
- 个人知识库 Store 和初版创建器。

## 1.2 当前中断状态

用户在功能施工中途要求停止代码实现，改为先冻结施工图纸。因此：

- 开屏页面已出现于工作区，但必须重新做浏览器验收。
- 教学与刷题完成体验已出现于工作区，但需要验证复教和题型判定。
- 节点悬停、闲置生命感、神经信号与节点定制工作室有中途改动。
- 最新一批三维关系线与工作室改动尚未完成完整测试。
- `git status` 中有大量已修改和未跟踪文件，均视为现有项目资产。

第一位施工人员不得立即继续加功能。先执行：

```bash
npm run typecheck
npm test
npm run build
```

若失败：

1. 记录完整错误。
2. 只修复中断造成的编译或类型问题。
3. 不顺手重构页面。
4. 三项重新通过后，保存一次版本快照。

## 1.3 建议建立施工分支

当前改动已经在工作区时，创建新分支不会删除改动：

```bash
git switch -c codex/iteach-v7-final
```

如果分支已经存在，不重复创建。禁止使用任何会覆盖当前工作区的命令。

---

# 2. 最终产品定义

## 2.1 一句话定义

iTeach 是一个把大学计算机知识组织成可探索关系网络，并由系统完成诊断、教学、练习、纠错和掌握验证的 AI 教学产品。

三维知识空间不是整个产品，而是“找到知识”和“看见关系”的入口。

## 2.2 Study 与 Teach 的明确边界

仅提供知识目录、搜索和学习路径属于 Study。

iTeach 必须主动完成以下行为，才属于 Teach：

```text
判断用户当前水平
→ 选择下一步教学内容
→ 解释概念
→ 展示示范
→ 给出引导练习
→ 检测是否掌握
→ 识别错误原因
→ 针对错误重新教学
→ 再次检测
→ 记录掌握证据
```

## 2.3 评委默认演示流程

评委进入产品后应能完成：

```text
开屏
→ 进入知识空间
→ 从俯视关系图自然进入三维斜视视角
→ 点击“进程”或“线性表”
→ 看见完整上下游关系
→ 开始学习
→ 故意答错一题
→ 系统识别误区并复教
→ 再次答对
→ 进入刷题验证
→ 查看错因和掌握度变化
→ 打开我的知识库
→ 创建一个新节点
→ 生成教学和题目
→ 发布到个人知识库
```

完整流程目标时长为 6 到 10 分钟。

---

# 3. 产品信息架构与路由

## 3.1 路由表

```text
/
  开屏与三个主要入口

/universe
  三维知识空间

/teach
  教学首页与系统推荐

/teach/:unitId
  单个教学会话

/practice
  刷题方式选择

/practice/session/:sessionId
  一题一屏的练习会话

/library
  我的知识库与大学课程模板

/library/new
  新建知识库

/library/:libraryId
  知识库详情

/library/:libraryId/edit
  编辑已有个人知识库

/progress
  学习记录、掌握度和误区
```

## 3.2 一级导航

开屏不显示全局导航。

其他页面顶部固定导航：

```text
[iTeach]  知识空间  教学  刷题  知识库            [搜索] [学习记录] [菜单/头像]
```

导航文案必须直接使用：

- 知识空间
- 教学
- 刷题
- 知识库
- 学习记录
- 搜索

禁止使用：

- 目标透镜
- 因果走廊
- 学习星河
- 认知跃迁
- 神经入口
- 目标头奖

## 3.3 组件位置

```text
src/app/AppRouter.tsx
src/app/AppShell.tsx
src/app/routes.ts
src/app/RouteTransition.tsx

src/components/navigation/GlobalNav.tsx
src/components/navigation/MobileNav.tsx
src/components/search/GlobalSearch.tsx
```

`AppRouter.tsx` 只负责路由和懒加载，不存业务状态。

标准结构：

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route element={<AppShell />}>
      <Route path="/universe" element={<UniversePage />} />
      <Route path="/teach" element={<TeachingHomePage />} />
      <Route path="/teach/:unitId" element={<TeachingSessionPage />} />
      <Route path="/practice" element={<PracticeHomePage />} />
      <Route path="/practice/session/:sessionId" element={<PracticeSessionPage />} />
      <Route path="/library" element={<LibraryHomePage />} />
      <Route path="/library/new" element={<LibraryBuilderPage />} />
      <Route path="/library/:libraryId" element={<LibraryDetailPage />} />
      <Route path="/progress" element={<ProgressPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

所有页面使用 `lazy()`。`/`、`/teach`、`/practice`、`/library` 不得加载 Three.js 分包。

---

# 4. 视觉系统冻结

## 4.1 设计方向

固定设计旋钮：

- 设计变化：7/10。
- 动效强度：7/10。
- 信息密度：6/10。
- 固定暗色主题。
- 气质：Apple 的产品克制、Claude/Kimi 的信息清楚、Google 的可用性、Awwwards 的空间叙事、Obsidian 的关系可读性。
- 不是赛博朋克，不是游戏场景，不是 AI 渐变模板。

## 4.2 色彩令牌

文件：`src/design/tokens.css`

建议固定：

```css
:root {
  --it-bg-deep: #050707;
  --it-bg: #080a0a;
  --it-surface: #0d0f0f;
  --it-surface-raised: #131616;
  --it-surface-hover: #181c1b;
  --it-text: #efefe9;
  --it-text-soft: #a7aaa3;
  --it-text-faint: #696f6a;
  --it-rule: rgb(239 239 233 / 0.10);
  --it-rule-strong: rgb(239 239 233 / 0.18);
  --it-accent: #d8c58f;
  --it-selected: #fff8dc;
  --it-success: #91b596;
  --it-danger: #d8897c;
  --it-ease: cubic-bezier(0.16, 1, 0.3, 1);
}
```

知识域颜色只编码知识分支：

```ts
const DOMAIN_COLORS = {
  '408': '#d8c58f',
  ai: '#84abb0',
  game: '#b28b82',
  frontend: '#8998b8',
};
```

规则：

- 界面按钮不跟随知识域变色。
- 选中节点使用暖白。
- 禁止默认紫蓝 AI 渐变。
- 不使用纯黑大面积对纯白。
- 不用外发光作为所有控件默认状态。

## 4.3 字体

- 主字体：Geist 或 Instrument Sans。
- 中文：PingFang SC、Microsoft YaHei、系统无衬线。
- 数字、坐标、题号：Geist Mono 或系统等宽字体。
- 普通正文不小于 13px。
- 可点击文字不小于 12px。
- 触控区域至少 44×44px。

## 4.4 圆角与表面

- 小按钮：6-8px。
- 输入框：6-8px。
- 普通面板：10-12px。
- 特殊知识卡：14px 上限。
- 标签不可全部胶囊化。
- 深度依靠表面明度、边线和空间遮挡，不依靠大阴影。

## 4.5 全局反 AI 味检查

- 不做三张等宽入口卡。
- 不做四张统计卡。
- 不做紫蓝渐变背景。
- 不做玻璃拟态堆叠。
- 不在每个模块前放小号大写眉题。
- 不把 Sparkle 用在所有 AI 功能。
- 不显示假在线状态、假版本号、假实时数字。
- 不用文艺名称替代普通功能名称。
- 不用无限粒子和无限光束证明“高级”。

---

# 5. 动画引擎所有权

一个元素只能由一种动画系统控制。

```text
Motion
  页面切换、面板、Tab、列表、题目切换、Hover Peek 展开

GSAP
  三维镜头、知识路径传播总时间线、节点定制工作室入场

Anime.js
  自定义关系 SVG 的一次性组装

Lottie
  真正完成教学或考试后的单次反馈

R3F useFrame / Shader
  节点材质、GPU 点、闲置呼吸、神经信号

CSS
  hover、focus、pressed
```

固定时长：

- Hover：120-180ms。
- 按下：80-120ms。
- Tab：180-240ms。
- 面板：220-300ms。
- 路由：360ms。
- 开屏进入：650ms。
- 三维镜头：620-900ms。
- 路径传播：900-1120ms。
- Lottie：1.2-1.8s，只播放一次。

`prefers-reduced-motion` 下：

- 不放大、不旋转、不模糊。
- 关系立即切换最终状态。
- Lottie 改为静态完成图标。
- 闲置生命感关闭。

## 5.1 用户指定资源的精确落位

本项目的本地参考目录是：

```text
/Users/morton_cheung/Desktop/AI/iTeach/iTeach-design-references
```

这些仓库不能全部复制进 `src`。施工时按下面的职责使用：

```text
taste-skill
  用于开屏、品牌页和最终反模板化检查
  不进入浏览器运行时

impeccable
  用于 audit、critique、polish、quieter 流程
  不复制其金箔品牌视觉

ui-ux-pro-max-skill
  用于 Three.js、响应式、无障碍和性能规则
  不进入浏览器运行时

awesome-design-md
  提取 Apple、Linear、Runway 等设计原则
  不照搬任一品牌页面

GSAP
  只负责复杂时间线、相机和节点定制入场

gsap-skills
  规定 useGSAP、scope、contextSafe、清理和性能方式

Inspira UI
  只移植 Animated Tabs、Animated Beam、Blur Reveal 的交互结构
  原项目是 Vue/Nuxt，禁止把 Vue 组件直接放入 React

Motion
  负责普通 React 页面、面板、列表和 Tab

lottie-web
  只负责真正完成教学、考试或发布后的单次反馈

Anime.js
  只负责个人知识关系 SVG 的一次性组装
```

运行时归属必须能在源码中指出：

```text
GSAP
  src/scene/CameraController.tsx
  src/scene/BatchedKnowledgeEdges.tsx
  src/features/library-builder/components/NodeAtelier.tsx

Motion
  src/app/RouteTransition.tsx
  src/components/NodeInspector.tsx
  src/features/landing/pages/LandingPage.tsx

Anime.js
  src/features/library-builder/components/NodeRelationPreview.tsx

Lottie
  src/components/feedback/MasteryCelebration.tsx
```

设计阶段参考：

- Marble / os-taxonomy：学习其空间分类和聚焦方法，不复制小学知识内容。
- Obsidian Graph View：学习节点、关系、局部聚焦和知识邻接阅读。
- Karpathy 的 AI + 个人知识系统思路：AI 帮助组织、解释、生成路径，但用户知识仍有稳定结构和可编辑来源。
- Awwwards Annual Awards：学习黑色编辑感、比例和动效节奏，不复制具体品牌资产。
- Foldcraft 案例：用于节点定制工作室的暗场、开口、光束和对象浮现。
- Marketeam 案例：用于开屏的左文案、右关系结构和俯视进入构图。

所有第三方依赖和参考来源继续记录到：

```text
THIRD_PARTY_NOTICES.md
docs/REFERENCE_MANIFEST.md
```

禁止为了证明“全部用上”而让所有动画库同时常驻首页。

---

# 6. 开屏页面 `/`

## 6.1 文件结构

```text
src/features/landing/pages/LandingPage.tsx
src/features/landing/components/KnowledgeGraphPreview.tsx
src/design/landing.css
```

## 6.2 桌面布局 1440×900

```text
┌──────────────────────────────────────────────────────────────┐
│ iTeach  AI教学系统                                           │
│                                                              │
│  把计算机知识变成               真实知识关系俯视图             │
│  可学习的路径。                 336 节点 / 646 关系            │
│                                  ○──○──○                      │
│  一行说明                         ╲ │ ╱                       │
│                                  ○─●─○                        │
│  [进入知识空间 →]               ╱ │ ╲                       │
│  我的知识库  刷题               ○──○──○                      │
│                                                              │
│  当前内容说明                                                 │
└──────────────────────────────────────────────────────────────┘
```

尺寸：

- 页面左右边距 52-58px。
- 左栏 500-520px。
- 右栏占剩余空间。
- 栏间距 64-80px。
- 标题 64-76px，最多三行。
- 主按钮 210×52px。
- 右侧关系图从顶部延伸到底部，不放入普通卡片。

## 6.3 响应式

- `>= 1280px`：完整双栏。
- `960-1279px`：左 40%，右 60%，标题 48-60px。
- `768-959px`：必须改为上下布局，禁止强行双栏。
- `< 768px`：标题、按钮、关系图纵向排列；网络最低 220px。
- 390×844 时主按钮满宽，两个次入口并排。

## 6.4 关系图代码职责

`KnowledgeGraphPreview.tsx` 使用 Canvas2D，而不是 R3F：

1. 读取真实 `knowledgeGraph.nodes` 和 `knowledgeGraph.edges`。
2. 将 `basePosition.x/z` 投影到二维。
3. 限制 DPR 最大 1.5。
4. 目标、方向、课程、知识、练习使用不同半径。
5. 连接线使用二次贝塞尔曲线。
6. 首次进入逐步绘制，完成后停止动画帧。
7. 不在首页加载 Three.js。

## 6.5 进入三维的连续转场

点击“进入知识空间”：

```ts
navigate('/universe', {
  state: { cinematicEntry: true },
});
```

时间线：

```text
0ms       锁定三个入口
0-280ms   品牌淡出
0-340ms   文案上移 16px 并淡出
0-650ms   俯视关系图放大约 2 倍、轻微倾斜和淡出
650ms     进入 /universe
650-1450ms 三维镜头从俯视改为正常斜视
```

主按钮 hover 或 focus 时可预加载 Universe 分包，避免转场后黑屏。

## 6.6 验收

- 开屏不显示全局导航。
- 不加载 WebGL。
- 三个入口不是三张卡片。
- 右侧展示真实节点，不是假装知识图的装饰圆圈。
- 768px 无横向溢出。
- 进入后镜头转场连续。

---

# 7. 三维知识空间 `/universe`

## 7.1 文件结构

```text
src/features/universe/pages/UniversePage.tsx
src/scene/UniverseCanvas.tsx
src/scene/CameraController.tsx
src/scene/NodePointField.tsx
src/scene/BatchedKnowledgeEdges.tsx
src/scene/NeuralSignals.tsx
src/scene/ScenePresenceController.tsx
src/components/ExplorerInterface.tsx
src/components/NodeInspector.tsx
src/store/knowledgeStore.ts
src/graph/relevance.ts
src/graph/causalCorridor.ts
```

## 7.2 图层与位置

```text
WebGL Canvas               z=0
空间暗角                   z=8
空间普通 UI                z=20
底部关系控制               z=52
右侧 Hover/节点详情        z=56
功能抽屉                   z=60
搜索                       z=70
通知                       z=80
全局导航                   z=100
```

导航高度只计算一次。

推荐做法：

- `.dom-layer` 保持 `inset: 0`。
- 空间控件自己使用 `top: calc(var(--it-nav-height) + 16px)`。
- 不同时下移父层和子元素。
- 空间内部 TopBar 不重复显示 BrandMark。

## 7.3 桌面布局

- Canvas 从导航下方延伸到底部。
- 工具按钮位于右上角，距右 24px，距导航底 16px。
- Hover Peek 固定右侧，宽 410px，高约 68px。
- 完整详情固定右侧，宽 410px，顶部 88px，底部 96px。
- 底部关系控制居中，高 58-62px。
- 目标、浏览和设置抽屉使用固定右侧锚点。
- 不允许面板一会左、一会右。

## 7.4 相机交互

`CameraControls` 固定映射：

```ts
mouseButtons={{
  left: ACTION.ROTATE,
  middle: ACTION.DOLLY,
  right: ACTION.TRUCK,
  wheel: ACTION.DOLLY,
}}

touches={{
  one: ACTION.TOUCH_ROTATE,
  two: ACTION.TOUCH_DOLLY_TRUCK,
  three: ACTION.TOUCH_TRUCK,
}}
```

行为：

- 左键旋转。
- 右键平移。
- 滚轮缩放。
- 自动运镜期间用户一操作，立即停止自动镜头。
- 选中节点后不锁定相机。
- 点击空白只清除 Hover，不自动关闭完整详情。
- Escape 或详情关闭按钮才关闭节点详情。

俯视进入：

```ts
if (cinematicEntry) {
  controls.setLookAt(cx, cy + distance, cz, cx, cy, cz, false);
  controls.setLookAt(
    cx + distance * 0.64,
    cy + distance * 0.42,
    cz + distance * 0.68,
    cx,
    cy,
    cz,
    true,
  );
}
```

只允许首次进入执行。Hover 不得触发 `fitToBox`。

## 7.5 节点渲染

节点外观：

- 核心清晰、可见。
- 光晕克制且不重叠成团。
- 四个分支使用四种低饱和颜色。
- 选中节点暖白。
- 无关节点不删除，透明度保持 0.12 以上。

GPU 属性：

```ts
position: Float32Array
color: Float32Array
aSize: Float32Array
aOpacity: Float32Array
aState: Float32Array
aDelay: Float32Array
```

视觉节点和命中逻辑分离。若 Points 命中在远景仍不稳定，新增一个透明 InstancedMesh 命中层：

```tsx
<instancedMesh
  onPointerMove={handleHover}
  onPointerDown={recordPointerStart}
  onPointerUp={selectWhenNotDragged}
/>
```

点击与拖动区分：

```ts
const moved = Math.hypot(
  event.clientX - start.x,
  event.clientY - start.y,
);

if (moved > 6) return;
selectNode(nodeId);
```

## 7.6 Hover 与点击面板

右侧面板只有两个状态：

```text
没有节点：不显示
Hover：只显示类型、名称、点击查看
Click：在同一位置展开完整详情
```

推荐将 Peek 与详情合并为 `NodeContextPanel`，使用同一个 `layoutId`。

Hover：

- 指针停留 80-100ms 后显示。
- 离开 60-80ms 后关闭。
- 不跟随鼠标。
- 不移动镜头。
- 不重建 336 节点与 646 条边。

Click 展开内容：

- 名称。
- 类型。
- 所属路径。
- 前置知识。
- 后续知识。
- 相关知识。
- 推荐学习内容。
- 开始学习。
- 练习这个知识点。
- 本地 AI 讲解。

## 7.7 完整路径点亮

选择中间节点时必须包含：

- 所有上层归属。
- 所有前置知识。
- 当前节点。
- 后续知识。
- 练习节点。

状态来源：

```ts
buildCausalCorridor(selectedNodeId)
```

动画时序：

```text
0-120ms     无关节点降低亮度
60-240ms    直接关系亮起
140-520ms   上游按深度传播
200-700ms   下游按深度传播
120-760ms   镜头适配完整关系区域
360-720ms   Hover Peek 展开为详情
900-1120ms  所有光强稳定并停止持续更新
```

线条使用曲线，Shader 需要：

```text
aProgress
aDelay
aDirection
color
```

背景边与激活边分开构建。选择节点时只更新激活 Geometry。

## 7.8 初次与闲置生命感

状态：

```ts
type ScenePresence = 'intro' | 'active' | 'idle';
```

规则：

- 进入后播放 4-5 秒轻微生命感。
- 用户操作时立即回到标准姿态。
- 无操作 9-12 秒后进入 idle。
- 指针只要停留在任意节点上，无论多久，都禁止进入 idle。
- Hover、拖动、滚轮、触控、键盘都视为用户操作。

允许的 idle 变化：

- Y 轴旋转最大约 0.055 rad。
- X 轴旋转最大约 0.012 rad。
- X/Z 缩放约 ±1.1%。
- Y 缩放约 ±0.6%。
- 6-10 个神经信号沿真实关系曲线移动。

性能限制：

- idle 以约 25fps 请求绘制。
- active 稳定后停止 Canvas 重绘。
- 标签页隐藏时停止所有闲置帧。
- reduced-motion 关闭 idle。

## 7.9 知识空间验收

- 随机点击 20 个不同层级节点均成功。
- Hover 不触发相机移动。
- 拖动不会误选节点。
- 选中后继续拖动，详情仍在。
- 中间节点上下游同时点亮。
- 桌面详情永远在右侧。
- 移动端详情永远是底部 Sheet。
- 初次与闲置有生命感，操作时没有抢控制权。

---

# 8. 我的知识库 `/library`

## 8.1 页面职责

回答三个问题：

1. 我现在有哪些知识库？
2. 哪个知识库可以直接进入教学或刷题？
3. 如何创建自己的知识库？

## 8.2 桌面布局

标题改为“我的知识库”。

```text
标题 + 一行说明                             [创建知识库]

┌────────────────────── 8列 ─────────────────────┐ ┌─ 4列 ─┐
│ 当前知识库名称                                 │ │其他知识库│
│ 节点、关系、教学、题目内联统计                 │ │列表      │
│                                                │ │每行64px  │
│ 大型真实关系缩略图 340-400px                   │ │          │
│                                                │ │          │
│ [打开知识库] [开始教学]                        │ │          │
└────────────────────────────────────────────────┘ └──────────┘

大学课程模板，横向滚动，不自动轮播
```

禁止：

- 当前知识库在右侧列表重复出现。
- 图谱外再套第二层卡片边框。
- 四个统计数字做成四张卡片。
- 模板全部做成相同小卡片。

## 8.3 响应式

- `>= 1024px`：8/4 不对称双栏。
- `768-1023px`：主知识库全宽，其他知识库放下方。
- `< 768px`：标题与创建按钮上下排列；图谱 210-230px；模板宽约 78vw 并 scroll-snap。

## 8.4 知识库详情

详情必须提供：

- 打开知识结构。
- 开始教学。
- 针对本库刷题。
- 编辑知识结构。
- 在知识空间查看。

标签：

- 知识结构。
- 教学单元。
- 题目。
- 来源。

---

# 9. 创建知识库 `/library/new`

## 9.1 页面结构

```text
全局导航 64px
BuilderTopBar 56px

┌任务轨 236px┬────────中央工作区────────┬检查区 296px┐
│添加资料     │当前步骤内容               │当前结果    │
│编辑结构     │                           │缺失项      │
│设置教学     │                           │下一步建议  │
│生成题目     │                           │            │
│预览发布     │                           │            │
└─────────────┴───────────────────────────┴────────────┘
```

步骤文案必须直接：

1. 添加资料。
2. 编辑结构。
3. 设置教学。
4. 生成题目。
5. 预览发布。

## 9.2 来源步骤

提供三种入口：

- 粘贴资料文本。
- 选择本地文本文件。
- 从大学课程模板开始。
- 从空白知识库开始。

规则：

- `.txt`、`.md`、`.json` 可用 FileReader 真正读取。
- PDF/Word 若没有解析器，明确写“演示结构解析”。
- 不宣称已经上传服务器。
- 模板匹配失败时优先读取真实标题和目录，不全部生成“基本概念、核心原理”。

## 9.3 结构编辑步骤

必须支持：

- 拖动节点。
- 平移画布。
- 缩放画布。
- 恢复全景。
- 选择节点。
- 明确进入连接模式。
- 选择关系类型。
- 删除节点或关系。
- 添加新节点。

拖动阈值至少 5-6px。拖动结束不得继续触发点击。

建立关系不能隐藏在“先点击一个节点，再点击另一个节点”的无提示流程里。界面显示：

```text
当前连接起点：进程
关系类型：前置
[取消连接]
```

边使用曲线并显示方向。

## 9.4 教学与题目步骤

设置教学必须生成完整可执行数据，不只保存 ID。

每个非课程节点至少生成：

- 1 个学习目标。
- 1 组前置诊断。
- 1 段概念讲解。
- 1 个示范。
- 4 道引导练习。
- 3 道独立检查。
- 2 道补救题。
- 1 个总结。

题目预览显示：

- 总题量。
- 题型分布。
- 难度分布。
- 无答案数量。
- 无解析数量。
- 无知识点映射数量。
- 至少三道真实题目预览。

## 9.5 发布条件

同时满足才允许发布：

```text
节点数量 > 0
至少一条合法关系
至少一个教学单元
至少一组题目
所有引用有效
无 hierarchy 循环
无自环
名称与必填字段合法
```

发布失败时直接定位到对应步骤。

---

# 10. 节点定制工作室

## 10.1 产品定义

用户明确要求保留“定制尊贵卡片”的体验。因此：

- 宇宙里的节点仍是发光神经元。
- 定制工作室里的卡片是“节点身份卡”，不是节点的三维外形。
- 卡片必须展示真实关系拓扑，避免成为纯装饰会员卡。
- 光束承担“新节点从空白知识树中出现”的信息，不是长期舞台特效。

## 10.2 文件结构

```text
src/features/library-builder/components/NodeAtelier.tsx
src/features/library-builder/components/NodeRelationPreview.tsx
src/features/library-builder/library-builder.css
src/store/libraryStore.ts
```

## 10.3 桌面布局 1440×900

```text
┌──────────────────── 左侧舞台 56% ──────────────────┬─ 右侧 44% ─┐
│                 顶部细窄光口                        │定制知识节点 │
│                     ╲  │  ╱                         │基本/关系/教学│
│                      ╲ │ ╱                          │/外观         │
│                  ┌───────────┐                      │              │
│                  │ 节点身份卡 │                      │表单滚动区    │
│                  │ 名称/说明  │                      │              │
│                  │ 关系拓扑   │                      │              │
│                  └───────────┘                      │取消  保存    │
└────────────────────────────────────────────────────┴──────────────┘
```

尺寸：

- 工作室 `z-index: 240`。
- 左舞台约 56%，右配置约 44%。
- 卡片约 420×540px，不超过视口高度 70%。
- 光口是 2-3px 细线。
- 光束为低透明中性白，禁止彩虹或紫色。
- 配置头 64px，Tab 44px，底部操作 64-68px。
- 关闭按钮放入配置头部。

## 10.4 节点属性

参考成熟属性图的“节点、标签、属性、带类型方向关系”结构；教学产品额外增加教学字段。

节点：

```ts
interface CustomKnowledgeNode {
  id: string;
  name: string;
  kind: 'course' | 'topic' | 'knowledge';
  layer: number;
  domain: string;
  color: string;
  description: string;
  content: string;
  tags: string[];
  difficulty: '基础' | '进阶' | '挑战';
  estimatedMinutes: number;
  learningObjectives: string[];
  misconceptions: string[];
  recommendedContent: string[];
  x: number;
  y: number;
}
```

关系：

```ts
interface CustomKnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationType: 'hierarchy' | 'prerequisite' | 'related' | 'practice_for';
  confidence?: number;
  sourceNote?: string;
}
```

分组：

```text
基本信息
  名称、类别、层级、领域、说明、标签

知识关系
  上级节点、前置知识、相关知识

教学内容
  教学正文、学习目标、常见误区、推荐内容

外观
  颜色、难度、预计时长
```

## 10.5 动画

打开：

```text
0-520ms     顶部细光口打开
80-700ms    光束出现
160-940ms   身份卡从暗处上移 54px 并归位
280-840ms   配置面板进入
```

实时预览：

- 名称、说明、标签即时更新。
- 关系变化时才重播 Anime.js 拓扑组装。
- 普通文字每次输入不得重播拓扑动画。
- 卡片光晕不随每个按键闪烁。

保存：

```text
0-120ms     表单锁定
80-280ms    关系线向卡片核心收束
220-440ms   卡片中的核心缩成真实节点尺寸
440-520ms   工作室关闭
520-780ms   新节点在结构画布最终位置亮起一次
```

## 10.6 移动端

禁止把 690px 预览和 720px 表单直接上下拼接。

390×844：

- 顶部栏 56px。
- 预览区 190-220px，可收起成 72px 摘要。
- Tab 44px，吸附顶部。
- 表单占剩余空间滚动。
- 底部保存栏 64px。
- 关系标签最多四个。

## 10.7 无障碍

- 根元素 `role="dialog"`。
- `aria-modal="true"`。
- 打开后焦点进入名称输入框。
- Tab 键不能离开工作室。
- Escape 关闭。
- 关闭后焦点返回“添加节点”按钮。
- 色板读出“暖金、冷青、石蓝、陶土、灰绿、灰粉”，不是十六进制值。

---

# 11. 教学系统 `/teach`

## 11.1 教学状态机

```ts
type TeachingPhase =
  | 'objective'
  | 'diagnostic'
  | 'explanation'
  | 'worked-example'
  | 'guided-practice'
  | 'independent-check'
  | 'remediation'
  | 'summary';
```

确定性规则：

```text
诊断合格
→ 进入讲解和示范

诊断较弱
→ 补充前置知识
→ 再进入讲解

引导练习发现误区
→ 进入对应复教

独立检查 >= 80%
→ 总结与掌握确认

独立检查未通过且补救次数 < 2
→ 复教
→ 新 attempt 的独立检查

补救次数达到 2 仍未通过
→ 结束本轮
→ 推荐前置教学单元
```

禁止无限循环。

## 11.2 教学页面布局

桌面：

```text
┌步骤轨 220px┬────────主教学舞台────────┬证据区 340px┐
│目标        │讲解、图解、示范、题目     │下一步判断  │
│诊断        │                            │错因        │
│讲解        │                            │掌握证据    │
│练习        │                            │            │
└────────────┴────────────────────────────┴────────────┘
                    底部操作 72px
```

移动端：

- 步骤轨变顶部横向步骤。
- 证据区变底部抽屉。
- 主教学内容单列。
- 不挂载 WebGL 背景。

## 11.3 关键正确性修复

`teachingStore.ts` 必须增加：

```ts
interface SessionAnswer {
  stepId: string;
  questionId: string;
  attempt: number;
  selected: string;
  correct: boolean;
  submittedAt: string;
}
```

从复教返回独立检查：

- `attempt + 1`。
- 当前选择清空。
- 旧 attempt 保留为证据。
- 第二次答案不能被第一次答案锁定。
- 页面显示“第 2 次检查”。

## 11.4 完成反馈

完成页展示实际证据：

- 诊断是否完成。
- 讲解是否完成。
- 示范是否完成。
- 引导练习正确率。
- 是否触发复教。
- 独立检查次数与正确率。
- 掌握度变化。

只有真正达到掌握终止条件才播放 `MasteryCelebration`。

补救失败时显示“本轮结束，建议补前置知识”，不得播放“掌握完成”动画。

---

# 12. 刷题系统 `/practice`

## 12.1 五个入口

- 今日练习。
- 按目标练习。
- 按知识点练习。
- 模拟试卷。
- 错题复习。

每个入口必须生成非空题组。

## 12.2 会话布局

桌面一次只显示一题：

```text
┌题号导航 190px┬────────题目舞台────────┬解析区 340px┐
│1 2 3 4...    │题干、选项、代码、图表   │提交后显示   │
│标记状态      │                         │答案、错因   │
└──────────────┴─────────────────────────┴────────────┘
                    底部操作 72px
```

移动端：

- 题号导航变横向列表。
- 解析区放在题目下方。
- 提交按钮固定底部。

## 12.3 题型判定

必须统一使用一个答案标准化函数，教学和刷题共用。

```ts
function normalizeAnswer(type, value) {
  if (type === 'multiple-choice') {
    return value.split(',').sort().join(',');
  }
  if (type === 'fill') {
    return value.trim().replace(/\s+/g, ' ');
  }
  return value;
}
```

规则：

- 单选严格单值相等。
- 多选按集合比较，`A,B` 与 `B,A` 相同，`A` 与 `A,B` 不同。
- 排序题保留顺序，顺序不同即错误。
- 判断题误区绑定错误值。
- 未答完全部题目，Store 层也禁止结束。

## 12.4 总结页

必须显示：

- 正确率。
- 正确数量。
- 错误数量。
- 错因分布。
- 最需要补学的知识点。
- 去教学。
- 再练一次。

错因数量合计必须等于错误题数。

---

# 13. 学习记录 `/progress`

页面回答：

- 我掌握了什么？
- 哪些证据支持这个判断？
- 我经常犯什么错？
- 下一步系统准备教什么？

布局：

- 顶部是掌握概览，不做四张统计卡。
- 中部左侧是证据时间线。
- 中部右侧是误区列表。
- 底部是下一教学任务。

`MasteryState` 必须包含 `learnerId`：

```ts
interface MasteryState {
  learnerId: string;
  nodeId: string;
  level: 0 | 1 | 2 | 3 | 4;
  confidence: number;
  updatedAt: string;
}
```

查询键使用 `learnerId + nodeId`，不能只按分支或 nodeId。

---

# 14. 统一内容模型与 Repository

## 14.1 为什么必须增加 Repository

系统静态内容与用户自定义内容不能继续使用两套互不兼容的读取方式。

新增：

```text
src/services/content/ContentRepository.ts
```

接口：

```ts
interface ContentRepository {
  getTeachingUnit(unitId: string): TeachingUnit | undefined;
  getTeachingStep(stepId: string): TeachingStep | undefined;
  getQuestion(questionId: string): Question | undefined;
  getQuestionsForNode(nodeId: string): Question[];
  getLibraryNodes(libraryId: string): KnowledgeNode[];
  getLibraryEdges(libraryId: string): KnowledgeEdge[];
}
```

读取顺序：

1. 系统静态内容。
2. 当前用户已发布知识库。
3. 找不到则返回 `undefined`。

以后这些页面只能通过 Repository 读取：

- TeachingSessionPage。
- PracticeSessionPage。
- LibraryDetailPage。
- NodeInspector 的“开始学习/练习”判断。

## 14.2 属性图依据

成熟属性图将实体建模为节点，用标签分类，用带方向和类型的关系连接，节点和关系均可拥有属性。iTeach 在此基础上增加学习目标、误区、教学内容和掌握证据。

参考：

- [Neo4j Graph Database Concepts](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/)
- [W3C RDF 1.2 Concepts](https://www.w3.org/TR/rdf12-concepts/)
- [Wikidata Data Model](https://www.wikidata.org/wiki/Help:Data_model)

自定义内容不能只保存 `teachingUnitIds` 和 `questionIds`，必须保存完整教学单元、教学步骤和题目。

---

# 15. 状态唯一来源与持久化

## 15.1 Store 所有权

```text
userStore
  当前学习者画像

knowledgeStore
  当前图谱、目标、选择节点、镜头意图、画质

teachingStore
  当前教学会话、步骤、attempt、答案、补救次数

practiceStore
  当前练习会话、题目顺序、作答、标记、状态

progressStore
  掌握度、答案记录、误区、证据、补救任务

libraryStore
  个人知识库、创建草稿、完整自定义教学与题目

uiStore
  全局搜索、移动菜单、临时 UI 状态
```

禁止 Store 双向导入。

## 15.2 持久化键

```text
iteach:v7:user
iteach:v7:knowledge
iteach:v7:teaching-session
iteach:v7:practice-session
iteach:v7:progress-delta
iteach:v7:libraries
iteach:v7:library-draft
```

规则：

- 每个域单独校验和迁移。
- 一个域损坏时只重置该域。
- 草稿刷新后恢复。
- 同名知识库使用不同 ID。
- 重置演示数据必须同步清理所有域。

## 15.3 自定义图谱校验

- 禁止自环。
- hierarchy 禁止循环。
- prerequisite 循环给出警告。
- 边去重包含 `source + target + relationType`。
- 删除节点时同时删除关联边。
- 发布前用 Zod 校验完整对象。

## 15.4 AI 接口结构

AI 功能不是聊天窗口。界面只在任务需要时调用：

- 目标解析。
- 节点解释。
- 学习路径生成。
- 个人资料结构化。
- 教学与题目生成。

文件建议：

```text
src/ai/contracts.ts
src/ai/goal/GoalMatcher.ts
src/ai/explanation/NodeExplainer.ts
src/ai/path/LearningPathPlanner.ts
src/ai/library/LibraryParser.ts
src/ai/teaching/TeachingDecisionEngine.ts
src/ai/providers/localProvider.ts
src/ai/providers/openAICompatibleProvider.ts
```

统一合同：

```ts
interface AIProvider {
  matchGoal(input: GoalInput): Promise<GoalMatchResult>;
  explainNode(input: ExplainNodeInput): Promise<NodeExplanation>;
  buildLearningPath(input: LearningPathInput): Promise<LearningPathResult>;
  parseLibrary(input: ParseLibraryInput): Promise<ParsedLibraryDraft>;
}
```

第一版默认使用 `localProvider`，所有结果确定性生成。未来接入 OpenAI Compatible API 时，只替换 Provider，不允许页面直接请求模型。

错误处理：

- 网络失败自动使用本地 Provider。
- UI 明确显示“本地演示结果”。
- 不伪装真实上传、实时联网或模型推理。
- AI 结果必须经过 Zod 校验后才能写入 Store。

开屏不强制填写用户画像。画像从“选择目标”或学习记录中补充，避免恢复已经删除的确认方向开屏。

---

# 16. 静态演示数据策略

## 16.1 数量目标

现有数据数量已经足够，不再盲目膨胀。

目标保持：

- 336 个系统知识节点。
- 646 条系统关系。
- 336 个教学单元。
- 每个单元 8 个教学步骤。
- 4000 道以上题目。
- 24 套模拟卷。
- 48 个大学课程模板。
- 24 个学习者画像。

## 16.2 重点人工内容

至少人工校对 32 个评委高概率节点：

- 线性表、栈、队列、树、图。
- 进程、线程、虚拟内存、死锁。
- TCP、HTTP、拥塞控制。
- 缓存、流水线。
- Transformer、RAG、向量数据库。
- React 状态、事件循环、浏览器渲染。
- 游戏循环、渲染管线、碰撞检测。

每个深度节点检查：

- 定义准确。
- 示例真实。
- 错误选项有合理迷惑性。
- 错因映射到具体误区。
- 补救教学真正对应误区。
- 前置关系正确。

## 16.3 性能原则

- 不一次把全部题目放入 React state。
- 题目按会话与种子生成。
- 模板进入详情时物化。
- 页面统计从 manifest 读取，不硬编码数量。

---

# 17. Windows 与跨设备性能

## 17.1 质量档位

```ts
const QUALITY_PROFILES = {
  quality: {
    maxDpr: 1.5,
    curveSegments: 18,
    bloom: true,
    idleFps: 25,
  },
  balanced: {
    maxDpr: 1.25,
    curveSegments: 10,
    bloom: true,
    idleFps: 20,
  },
  performance: {
    maxDpr: 1,
    curveSegments: 6,
    bloom: false,
    idleFps: 0,
  },
};
```

默认先用 balanced，不先启动最高画质。

## 17.2 Canvas

```tsx
<Canvas
  frameloop="demand"
  dpr={resolvedDpr}
  gl={{
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  }}
/>
```

只在这些情况下刷新：

- 自动镜头。
- 用户旋转、平移、缩放。
- 节点传播。
- Hover 视觉切换。
- 初次或闲置生命感。
- 图谱布局变化。

页面离开 `/universe` 后必须卸载 Canvas。

## 17.3 性能验收

测试：

- 1366×768，DPR 1。
- 1920×1080，DPR 1.25。
- 2560×1440，DPR 1.5。
- Windows Chrome 与 Edge。

目标：

- 常态 Draw Call 不超过 10。
- Hover 不重建整个图谱模型。
- 点击响应小于 100ms。
- INP 小于 200ms。
- Windows 集显均衡档常规探索平均 45fps 以上。
- 标签页隐藏时 GPU 活动接近 0。
- 教学、刷题、知识库页面不挂载 WebGL。

---

# 18. 精确施工顺序

## 批次 0：恢复可验证基线

文件：不新增功能文件。

动作：

1. 运行 typecheck、test、build。
2. 修复中断造成的类型和构建问题。
3. 打开 `/`、`/universe`、`/teach`、`/practice`、`/library`。
4. 保存 1440×900 截图。
5. 记录控制台错误。

退出条件：三项命令通过，五个页面可打开。

## 批次 1：修正题型判定

文件：

```text
src/data/v6/generators/questionBuilders.ts
src/data/v6/schemas/questionSchema.ts
src/ai/teaching/TeachingDecisionEngine.ts
src/features/teaching/components/QuestionCard.tsx
src/features/practice/components/PracticeQuestion.tsx
```

动作：

1. 统一答案标准化。
2. 修复多选、排序、判断题。
3. 新增题型测试。

退出条件：五类题型正确和错误用例全部通过。

## 批次 2：修正教学复测与终止

文件：

```text
src/store/teachingStore.ts
src/ai/teaching/TeachingDecisionEngine.ts
src/features/teaching/pages/TeachingSessionPage.tsx
src/features/teaching/components/TeachingCompletionEvidence.tsx
```

动作：

1. 增加 attempt 与 remediationCount。
2. 复教后允许重新检查。
3. 最多两轮复教。
4. 失败时回到前置教学。

退出条件：四条教学分支测试通过，无死循环。

## 批次 3：统一系统与自定义内容

文件：

```text
src/data/v6/schemas/customContentSchema.ts
src/services/content/ContentRepository.ts
src/features/library-builder/generateCustomContent.ts
```

动作：

1. 保存完整教学单元、步骤和题目。
2. Repository 同时读取系统和用户内容。
3. 页面停止直接访问静态 Map。

退出条件：自定义节点能进入同一个教学页和刷题页。

## 批次 4：持久化和状态隔离

文件：

```text
src/store/userStore.ts
src/store/progressStore.ts
src/store/teachingStore.ts
src/store/practiceStore.ts
src/store/libraryStore.ts
src/services/persistence/demoPersistence.ts
```

动作：

1. MasteryState 增加 learnerId。
2. 持久化教学与刷题会话。
3. 持久化知识库草稿。
4. 增加 V6 到 V7 迁移。

退出条件：刷新后会话、进度和草稿恢复。

## 批次 5：完成知识库创建闭环

文件：

```text
src/features/library-builder/pages/LibraryBuilderPage.tsx
src/features/library-builder/components/SourceStep.tsx
src/features/library-builder/components/GraphEditorStep.tsx
src/features/library-builder/components/NodeAtelier.tsx
src/features/library-builder/components/TeachingSchemaStep.tsx
src/features/library-builder/components/QuestionGenerationStep.tsx
src/features/library-builder/components/PublishPreviewStep.tsx
```

动作：

1. 草稿不再每次进入就清空。
2. 图编辑器支持平移缩放和明确连接模式。
3. 节点定制工作室完成响应式与无障碍。
4. 生成完整教学与题目。
5. 发布前完整校验。

退出条件：用户能从空白创建、发布、教学、刷题。

## 批次 6：完成开屏与三维交互

文件：第 6、7 章列出的文件。

动作：

1. 验证 2D 假象到 3D 转场。
2. 修正导航高度和重复品牌。
3. Hover Peek 与详情同位展开。
4. 所有节点可点击。
5. 相机可打断。
6. 路径完整传播。
7. idle 不抢交互。

退出条件：随机 20 节点、拖动、缩放、面板和 idle 测试全部通过。

## 批次 7：视觉收敛

动作：

1. 使用统一令牌。
2. 删除重复边框和嵌套卡片。
3. 删除紫蓝 AI 渐变和无意义光效。
4. 统一直接文案。
5. 逐页检查 390、768、1440、1920。

退出条件：不存在明显模板化 AI 页面，信息层级可一次读懂。

## 批次 8：E2E、性能与部署

文件：

```text
playwright.config.ts
e2e/judge-flow.spec.ts
e2e/teaching-remediation.spec.ts
e2e/practice-completion.spec.ts
e2e/library-builder.spec.ts
e2e/persistence.spec.ts
e2e/responsive.spec.ts
```

动作：

1. 完成评委闭环。
2. 验证深层路由刷新。
3. 验证 Windows 性能档。
4. 验证移动端。
5. 检查控制台与内存。

退出条件：本章全部测试通过。

---

# 19. 自动化测试清单

## 19.1 单元测试

新增：

```text
src/ai/teaching/TeachingDecisionEngine.test.ts
src/data/v6/generators/questionBuilders.test.ts
src/store/teachingStore.test.ts
src/store/practiceStore.test.ts
src/store/progressStore.test.ts
src/store/libraryStore.test.ts
src/services/content/ContentRepository.test.ts
src/services/persistence/demoPersistence.test.ts
```

核心断言：

- 多选集合正确比较。
- 排序题顺序正确比较。
- 判断题误区绑定错误项。
- 复教后可以第二次作答。
- 补救最多两次。
- 未答完不能结束练习。
- 同一学习者同一节点只有一条 MasteryState。
- 同名知识库不会覆盖。
- 自定义内容可被 Repository 读取。
- 本地数据损坏只重置自身域。

## 19.2 E2E

评委主流程：

1. 打开 `/`。
2. 点击进入知识空间。
3. 验证三维镜头进入。
4. 旋转、平移、缩放。
5. Hover 节点显示右侧名称。
6. 点击节点，详情展开。
7. 验证上下游路径点亮。
8. 点击开始学习。
9. 故意答错触发复教。
10. 第二次答对完成。
11. 进入刷题。
12. 完成题组并查看错因。
13. 创建个人知识库。
14. 添加节点和关系。
15. 生成教学、题目并发布。
16. 刷新页面，验证数据保留。

响应式截图：

- 390×844。
- 768×1024。
- 1366×768。
- 1440×900。
- 1920×1080。

---

# 20. 部署规范

项目使用 BrowserRouter，服务器必须把非静态请求回退到 `/index.html`。

Vercel：增加重写规则。

项目根目录新增 `vercel.json`：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Nginx：

```nginx
location / {
  try_files $uri /index.html;
}
```

若部署平台不能配置回退，改用 HashRouter。

直接访问以下路径必须成功：

```text
/universe
/teach/tu-example
/practice/session/daily
/library/example
/progress
```

---

# 21. 最终人工验收脚本

## 21.1 开屏

- 页面是否一眼能看懂产品用途？
- 三个入口是否有明确主次？
- 是否没有三张卡片和紫蓝渐变？
- 右侧是否是真实知识关系？

## 21.2 知识空间

- 左键旋转、右键平移、滚轮缩放是否有效？
- 选中节点后是否仍能操作镜头？
- Hover 是否只显示名称？
- 点击后面板是否在同一位置展开？
- 上游和下游是否同时点亮？
- 无关节点是否仍可见？
- 长时间 Hover 是否不会进入 idle？

## 21.3 教学

- 系统是否真的决定下一步？
- 答错是否解释为什么错？
- 是否进入对应复教？
- 是否可以再次检测？
- 是否一定有终止出口？

## 21.4 刷题

- 五个入口是否都能生成题组？
- 多选和排序是否正确？
- 总结是否展示错因与补学建议？
- 去教学是否进入真实教学单元？

## 21.5 知识库

- 是否能从空白开始？
- 节点是否可拖动、画布是否可缩放？
- 定制卡是否实时反映属性？
- 教学字段是否真的进入教学内容？
- 发布后是否能教学和刷题？
- 刷新是否保留？

## 21.6 跨设备

- 390px 是否没有横向滚动？
- 768px 是否没有被强行压缩成窄双栏？
- 1440px 是否保持完整构图？
- Windows 是否自动使用合适质量？

---

# 22. 最终交付报告模板

施工完成后必须提交：

```text
1. 修改文件列表
2. 已实现功能
3. 技术架构
4. 启动方式
5. 测试结果
6. 性能结果
7. 当前不足
8. 后续优化建议
9. 已知演示数据边界
10. 部署地址或部署步骤
```

启动：

```bash
npm install
npm run dev
```

生产验证：

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

---

# 23. 最终施工判断

本项目的重点不是继续增加页面数量，而是把以下闭环做实：

```text
知识关系可见
→ 系统主动教学
→ 错误可以归因
→ 归因触发复教
→ 复教后再次检测
→ 练习回写掌握度
→ 自定义知识也能进入同一闭环
```

视觉高级感来自：

- 比例准确。
- 信息层级清楚。
- 空间主体优先。
- 动画表达状态。
- 文案直接。
- 性能稳定。

不是来自：

- 更多光效。
- 更多渐变。
- 更多悬浮卡片。
- 更多粒子。
- 更多“AI”装饰词。

施工人员应把本文件当作冻结规格。若某个实现与本文件冲突，先回到产品闭环与用户操作优先级判断，不擅自增加新的世界观和动画。
