# Knowledge Universe V5 详细施工指南

> 版本：V5.0 施工冻结稿  
> 项目路径：`/Users/morton_cheung/Desktop/AI/iTeach`  
> 施工目标：在保留 336 个计算机知识节点和既有 AI 能力的前提下，把当前 Demo 改造成可自由观察、所有节点可选、全链路点亮、面板位置稳定，并能在 Windows 核显和高分屏设备上流畅运行的比赛展示产品。  
> 本文是实施说明书，不是灵感提案。施工时按章节顺序执行，不在中途重新设计。

---

## 0. 使用方法

### 0.1 本轮只做什么

本轮完成以下六件事：

1. 修复三维空间无法自由旋转、缩放、平移的问题。
2. 让 336 个节点全部可点击，不再依赖肉眼几乎看不到的小球命中区域。
3. 点击任意节点后，同时点亮它的前置知识、上层归属、后续知识和练习链路。
4. 合并“目标透镜”和“知识地图”，所有面板固定在同一位置。
5. 重做黑色编辑感视觉系统，减少模板化、玻璃化和“AI 风格”装饰。
6. 从渲染架构上解决 Windows 卡顿，不靠简单关闭动画掩盖问题。

### 0.2 本轮明确不做什么

- 不重新设计知识数据内容，不删除现有 336 个节点。
- 不接入真实付费 AI 接口，只保留当前兼容接口和本地回退。
- 不引入新的动画运行库。三维过渡使用 Camera Controls 和 GSAP，DOM 微动效使用 CSS 或现有 Motion。
- 不迁移 WebGPU。比赛 Demo 继续使用成熟的 WebGL 路线。
- 不复制 Marble、Awwwards 或参考仓库的页面、数据与品牌资产。
- 不增加视频背景、随机粒子、无意义呼吸、极光、流体玻璃、霓虹边框和永久循环光束。

### 0.3 每一步的操作规则

完全不会代码的执行者也按下面的固定方法工作：

1. 在终端进入项目目录：

```bash
cd /Users/morton_cheung/Desktop/AI/iTeach
```

2. 查看当前改动，不覆盖用户已有工作：

```bash
git status --short
```

3. 建议从当前状态创建一个施工分支：

```bash
git switch -c codex/knowledge-universe-v5
```

4. 每完成一个施工批次，依次运行：

```bash
npm run typecheck
npm test
npm run build
```

5. 三项都通过后再进入下一批次。失败时只修复当前批次，不跨批次堆积问题。

---

## 1. 最终产品定义

### 1.1 一句话产品定义

知识宇宙不是课程目录，也不是带三维背景的普通网页。它是一个由学习目标驱动的三维知识网络：用户可以自由观察整个计算机知识空间，点击任意知识节点，并立即看见这个节点从上层目标、所属课程、前置知识到后续练习的完整关系。

### 1.2 最终默认流程

#### 首次打开

1. 页面直接进入全屏知识空间，不显示“确认方向”开屏。
2. 默认展示全部知识，四个方向同时存在，但没有方向被强制选中。
3. 左键拖动可旋转，右键拖动可平移，滚轮可缩放。
4. 顶部只保留产品名、搜索、选择目标、浏览知识、学习计划五类必要入口。

#### 选择目标

1. 用户点击顶部“选择目标”。
2. 右侧固定工作区打开，显示四个常用目标和一个自然语言输入框。
3. 用户选择“计算机考研 408”。
4. 408 相关节点变亮、靠近视觉中心；其他方向保留但降低透明度。
5. 镜头平滑适配 408 区域，动画结束后仍然可以自由拖动。

#### 点击任意节点

以“线性表”为例：

1. 用户点击光点，屏幕命中半径至少为 14 px，触控设备至少为 22 px。
2. “线性表”核心先变成暖白色。
3. 其上方的“数据结构 → 考研 408 → 计算机研究生”被依次点亮。
4. 其下方的“链表操作题”以及可解锁的后续知识被依次点亮。
5. 无关节点不删除，只降低亮度和线条存在感。
6. 镜头适配整条关系链，而不是只盯住一个点。
7. 右侧同一个工作区切换为节点详情，位置不跳动。
8. 用户在镜头移动期间拖动时，自动镜头立即终止并把控制权交给用户。

#### 结束当前探索

- 按 `Esc`：先关闭搜索或工作区；再次按 `Esc` 清除当前节点选择，回到当前目标范围。
- 点击“适配全景”：重新适配当前目标或全部知识，但不删除当前目标。
- 点击“全部知识”：清除目标筛选和节点选择，显示完整空间。

### 1.3 完成条件

只有同时满足下面条件才算完成：

- 336 个节点全部可选择。
- 旋转、缩放、平移在选中节点前后都可用。
- 用户操作可以打断自动镜头。
- 点击中间层节点时，上游和下游链路同时点亮。
- 桌面面板始终在右侧同一位置；移动端始终使用底部面板。
- 页面没有开屏确认步骤。
- Windows 1920 × 1080 核显设备在“自动”画质下，常规探索中位帧率达到 45 FPS 以上。
- 生产构建、单元测试和核心浏览器流程全部通过。

---

## 2. 视觉与交互总规范

### 2.1 设计方向

设计旋钮固定为：

- 设计变化：7/10
- 动效强度：7/10
- 信息密度：5/10
- 色调：固定黑色系
- 气质：Awwwards 的黑色编辑感 + Apple 的层级克制 + Claude/Kimi 的产品清晰度 + Obsidian Graph View 的关系可读性

这里的“高级”来自比例、留白、光线、信息节奏和直接操控，不来自堆叠特效。

### 2.2 色彩规则

界面本身保持中性，知识域才使用颜色：

```css
:root {
  --ku-bg: #050606;
  --ku-bg-elevated: #0b0d0d;
  --ku-panel: rgb(10 12 12 / 0.94);
  --ku-text: #f1f3f2;
  --ku-text-soft: #a6acab;
  --ku-text-faint: #666d6b;
  --ku-rule: rgb(255 255 255 / 0.09);
  --ku-rule-strong: rgb(255 255 255 / 0.16);
  --ku-selected: #fff7e6;
  --ku-408: #78c6d4;
  --ku-ai: #d8b56f;
  --ku-game: #df8b7d;
  --ku-frontend: #83b99c;
  --ku-danger: #e28b80;
}
```

必须遵守：

- 选择节点用暖白，不用统一紫色。
- 四个知识方向保留四种低饱和域色，避免所有光点黏成一团。
- 无关节点透明度不得低于 0.12，确保“仍在同一个世界中”。
- 面板不使用彩色渐变，不使用大面积玻璃折射。

### 2.3 字体规则

将本地参考目录中的字体复制到项目资产目录：

```text
来源：iTeach-design-references/ui-ux-pro-max-skill/.claude/skills/ui-styling/canvas-fonts/
目标：public/fonts/
```

使用：

- 英文与数字：Instrument Sans。
- 坐标、节点数量、性能数据：Geist Mono。
- 中文：`PingFang SC`, `Microsoft YaHei`, `Noto Sans CJK SC`, `system-ui`。
- 正文最小字号 12 px；交互按钮最小字号 12 px；辅助状态最小字号 10 px。
- 大标题最大 30 px，避免营销落地页式巨型文字遮挡空间。

### 2.4 节点外观

每个节点是一个神经元，不是胶囊、卡片或小行星：

1. 核心：清晰、饱和、尺寸稳定的实心发光点。
2. 细胞膜：比核心大 1.55 倍的低透明边界，表达层级而不是装饰。
3. 光晕：柔和圆形光域，最大半径受最近邻距离限制。
4. 标签：只有焦点、关系链、目标层和少量主要节点显示；不为每个点创建常驻 DOM。

光晕上限使用下面的规则：

```ts
haloRadius = Math.min(
  visualBaseHalo,
  nearestNodeDistanceOnSameLayer * 0.24,
);
```

这样两个同层节点的光晕在大部分视角下不会直接叠成一个光团。若节点非常密集，先缩小光晕，绝不提高整体 Bloom 强度。

### 2.5 连线外观

- 所有关系线必须是确定性的三次贝塞尔曲线，不使用完全随机控制点。
- 背景线：1 px，透明度 0.025 到 0.07。
- 当前目标线：1 px，透明度 0.14 到 0.24。
- 上游关系：从上层到当前节点使用域色向暖白过渡。
- 下游关系：从当前节点向练习层使用暖白向域色过渡。
- 选择后只播放一次“光信号沿突触传递”，不得永久循环。
- Windows 的原生 WebGL 线宽实现不稳定，因此不依赖 `linewidth > 1`；高级感来自颜色、曲率、明暗头部和时序。

### 2.6 动效时间表

节点选择使用一个总长约 900 ms 的信息动效：

| 时间 | 动作 | 表达的信息 |
|---|---|---|
| 0 到 120 ms | 节点核心收紧并变暖白 | 确认用户选择 |
| 80 到 220 ms | 无关节点降低亮度 | 建立注意力层级 |
| 120 到 720 ms | 上游和下游按图深度传播 | 展示知识因果关系 |
| 180 到 820 ms | 镜头适配整条关系链 | 把完整上下文带入视野 |
| 480 到 780 ms | 右侧工作区裁切展开 | 呈现结构化详情 |
| 520 到 900 ms | 文本短距离依次进入 | 建立阅读顺序 |

限制：

- 位移最多 12 px，模糊从 8 px 降到 0。
- DOM 过渡使用 `cubic-bezier(0.16, 1, 0.3, 1)`。
- 用户拖动镜头时，立即终止 Camera Controls 的自动过渡，不等待 900 ms。
- `prefers-reduced-motion: reduce` 下不播放传播追光和位移，只做 120 ms 明暗切换。

### 2.7 禁止清单

- 禁止在顶部显示当前“方向”大标题。
- 禁止“目标透镜”“因果走廊”“知识星图”等故作文艺的产品文案。
- 禁止一会左侧面板、一会右侧面板。
- 禁止永久呼吸、随机漂移、粒子爆炸和背景视频。
- 禁止把界面做成卡片 Dashboard。
- 禁止所有按钮都做成圆角药丸。
- 禁止把模糊背景作为层级的唯一手段。

---

## 3. 精确页面布局

### 3.1 桌面布局，宽度大于等于 1120 px

基准画布：1440 × 900。

#### 顶部导航

```text
位置：fixed
top: 18px
left: 24px
right: 24px
height: 44px
z-index: 70
```

左侧：

- “知识宇宙”，字号 15 px，字重 600。
- 右侧紧跟 `336 个知识节点`，Geist Mono，10 px，弱化显示。
- 不显示当前方向名称。

右侧按钮从左到右：

1. 搜索，图标 `MagnifyingGlass`，快捷键 `/`。
2. 选择目标，图标 `Target`。
3. 浏览知识，图标 `TreeStructure`。
4. 学习计划，图标 `Path`。
5. 适配全景，图标 `CornersOut`。

按钮高度 36 px，左右内边距 10 px，按钮间距 4 px。默认透明背景，悬停时只显示 `rgb(255 255 255 / 0.06)`，不加发光边框。

#### 三维空间

```text
position: fixed
inset: 0
z-index: 0
background: #050606
```

空间始终铺满全屏。工作区覆盖在其上，不改变 Canvas 的 CSS 尺寸；相机适配时通过关系链包围盒和右侧预留量计算构图。

#### 固定工作区

```text
position: fixed
top: 78px
right: 24px
bottom: 24px
width: clamp(360px, 28vw, 420px)
z-index: 60
border: 1px solid rgb(255 255 255 / 0.12)
border-radius: 8px
background: rgb(10 12 12 / 0.94)
```

工作区只有一个实例，承载四种内容：

- `goal`：选择目标。
- `browse`：浏览知识。
- `node`：节点详情。
- `plan`：学习计划。

任何模式切换只替换内部内容，不改变 `top/right/bottom/width`。

#### 场景工具条

```text
position: fixed
left: 24px
bottom: 20px
height: 36px
z-index: 50
```

只保留三个有明确用途的控件：

- “旋转 / 平移 / 缩放”操作提示，10 px。
- “全部知识”按钮。
- “性能”按钮，打开画质选项，不常驻显示 FPS。

#### 标签层

标签是一个覆盖全屏的单一 DOM 容器，`pointer-events: none`。标签最多显示：高画质 12 个、均衡 8 个、性能 5 个。节点本身的点击由 Canvas 统一命中，不由标签承担。

### 3.2 中等屏幕，768 到 1119 px

- 顶部导航左右边距改为 16 px。
- 按钮只显示图标，悬停或键盘聚焦时显示文字提示。
- 工作区 `right: 16px; width: min(380px, calc(100vw - 32px))`。
- 工作区打开后，相机构图中心向左偏移，完整关系链不得被面板遮住。
- 场景工具条 `left: 16px; bottom: 16px`。

### 3.3 移动端，宽度小于 768 px

- 顶部高度 56 px，左右边距 12 px。
- 左侧只显示“知识宇宙”。
- 右侧只显示搜索、选择目标、浏览知识三个图标。
- 工作区改成底部 Sheet：`left: 10px; right: 10px; bottom: 10px; max-height: 68dvh; border-radius: 12px`。
- 节点选中后 Sheet 默认高度为 56dvh，可下拉到 28dvh，也可上拉到 76dvh。
- Sheet 顶部必须有 32 × 4 px 的拖动指示条。
- 触控手势：单指旋转，双指缩放并平移。
- 触控点击命中半径最少 22 px。
- 不显示常驻操作提示，第一次触控 Canvas 后显示一次 2 秒提示。

---

## 4. 最终文件结构

施工完成后的核心结构固定如下：

```text
src/
├── App.tsx
├── main.tsx
├── ai/
│   └── localKnowledgeAI.ts
├── animation/
│   ├── motionTokens.ts
│   └── SelectionDirector.tsx
├── components/
│   ├── navigation/
│   │   └── TopNavigation.tsx
│   ├── search/
│   │   └── SearchCommand.tsx
│   ├── scene-ui/
│   │   ├── NodeLabelLayer.tsx
│   │   └── SceneToolbar.tsx
│   └── workspace/
│       ├── GoalSelector.tsx
│       ├── KnowledgeBrowser.tsx
│       ├── LearningPlan.tsx
│       ├── NodeDetails.tsx
│       ├── WorkspacePanel.tsx
│       └── WorkspaceTabs.tsx
├── data/
│   ├── knowledgeGraph.ts
│   └── knowledgeGraph.test.ts
├── design/
│   ├── domainPalette.ts
│   └── tokens.ts
├── graph/
│   ├── GraphRepository.ts
│   ├── buildSceneSnapshot.ts
│   ├── causalCorridor.ts
│   ├── curveBuffers.ts
│   ├── picking.ts
│   ├── types.ts
│   └── validation.ts
├── performance/
│   ├── PerformanceGovernor.tsx
│   ├── PerformanceHud.tsx
│   ├── qualityPolicy.test.ts
│   ├── qualityPolicy.ts
│   └── types.ts
├── scene/
│   ├── BatchedKnowledgeEdges.tsx
│   ├── CameraRig.tsx
│   ├── InstancedKnowledgeNodes.tsx
│   ├── KnowledgeField.tsx
│   ├── KnowledgeFieldCanvas.tsx
│   ├── PostEffects.tsx
│   ├── SceneInteraction.tsx
│   └── ScreenProjectionBridge.tsx
├── store/
│   └── knowledgeStore.ts
└── styles/
    ├── app-shell.css
    ├── fonts.css
    ├── reset.css
    ├── responsive.css
    ├── scene-ui.css
    ├── tokens.css
    └── workspace.css
```

### 4.1 旧文件迁移表

| 当前文件 | 处理方式 | 新归属 |
|---|---|---|
| `scene/UniverseCanvas.tsx` | 替换后删除 | `KnowledgeFieldCanvas.tsx` + `KnowledgeField.tsx` |
| `scene/CameraController.tsx` | 完全替换 | `CameraRig.tsx` |
| `scene/KnowledgeNodeMesh.tsx` | 完全替换 | `InstancedKnowledgeNodes.tsx` |
| `scene/KnowledgeCurves.tsx` | 完全替换 | `BatchedKnowledgeEdges.tsx` |
| `scene/ScreenAnchorTracker.tsx` | 替换后删除 | `ScreenProjectionBridge.tsx` |
| `components/GoalLensDrawer.tsx` | 删除 | `GoalSelector.tsx` |
| `components/KnowledgeAtlasDrawer.tsx` | 删除 | `KnowledgeBrowser.tsx` |
| `components/NodeInspector.tsx` | 重构 | `NodeDetails.tsx` |
| `components/CausalCorridorDock.tsx` | 删除 | `SceneToolbar.tsx` + `NodeDetails.tsx` |
| `components/TopBar.tsx` | 重构并改名 | `TopNavigation.tsx` |
| `components/CommandPalette.tsx` | 重构并改名 | `SearchCommand.tsx` |
| `styles.css` | 完成迁移后删除 | `styles/*.css` |

删除旧文件必须放在所有新文件编译通过之后。不得先删后补。

---

## 5. 核心数据契约

先修改 `src/graph/types.ts`。这一步是后续所有组件的共同语言。

```ts
export type AppPhase = 'overview' | 'goalFocused' | 'nodeFocused';

export type WorkspaceMode =
  | 'goal'
  | 'browse'
  | 'node'
  | 'plan'
  | null;

export type RelationMode =
  | 'primary'
  | 'all'
  | 'upstream'
  | 'downstream';

export type QualityPreference =
  | 'auto'
  | 'quality'
  | 'balanced'
  | 'performance';

export type ResolvedQualityTier =
  | 'quality'
  | 'balanced'
  | 'performance';

export interface CameraCommand {
  id: number;
  mode: 'overview' | 'goal' | 'corridor';
  nodeIds: string[];
  interruptible: true;
}

export interface NodeRenderRecord {
  id: string;
  index: number;
  position: [number, number, number];
  targetPosition: [number, number, number];
  color: string;
  visualState: VisualState;
  relevance: number;
  coreRadius: number;
  membraneRadius: number;
  haloRadius: number;
  propagationDelay: number;
  labelPriority: number;
}

export interface EdgeRenderRecord {
  id: string;
  sourceIndex: number;
  targetIndex: number;
  visualState: EdgeVisualState;
  propagationDelay: number;
  direction: 'none' | 'in' | 'out';
}

export interface SceneSnapshot {
  revision: number;
  nodes: NodeRenderRecord[];
  edges: EdgeRenderRecord[];
  nodeIndexById: ReadonlyMap<string, number>;
  corridorNodeIds: ReadonlySet<string>;
  corridorEdgeIds: ReadonlySet<string>;
  labelNodeIds: string[];
}
```

规则：

- 原始知识数据只存在于 `knowledgeGraph.ts`。
- 图索引只存在于 `GraphRepository.ts`。
- 选择结果和用户偏好只存在于 Zustand。
- 336 个节点的派生渲染状态不写回 Store，由 `buildSceneSnapshot` 纯函数生成。
- `hoveredNodeId` 不再参与整张 `SceneSnapshot` 的重建。

---

## 6. Store 设计

替换 `src/store/knowledgeStore.ts` 的状态接口，保留已有 AI 异步逻辑。

```ts
interface KnowledgeStore {
  phase: AppPhase;
  profile: UserProfile | null;
  selectedGoalId: string | null;
  selectedNodeId: string | null;
  workspaceMode: WorkspaceMode;
  relationMode: RelationMode;
  learningPath: string[];
  qualityPreference: QualityPreference;
  resolvedQualityTier: ResolvedQualityTier;
  cameraCommand: CameraCommand;
  selectionEpoch: number;

  selectGoal: (goalId: string | null) => void;
  selectNode: (nodeId: string) => void;
  clearNodeSelection: () => void;
  showAllKnowledge: () => void;
  openWorkspace: (mode: Exclude<WorkspaceMode, null>) => void;
  closeWorkspace: () => void;
  setRelationMode: (mode: RelationMode) => void;
  requestFit: () => void;
  setQualityPreference: (value: QualityPreference) => void;
  resolveQualityTier: (value: ResolvedQualityTier) => void;
}
```

### 6.1 `selectNode` 的准确行为

```ts
selectNode: (nodeId) => {
  if (!graphRepository.hasNode(nodeId)) return;

  const corridor = graphRepository.corridor(nodeId);

  set((state) => ({
    phase: 'nodeFocused',
    selectedNodeId: nodeId,
    workspaceMode: 'node',
    selectionEpoch: state.selectionEpoch + 1,
    cameraCommand: {
      id: state.cameraCommand.id + 1,
      mode: 'corridor',
      nodeIds: [...corridor.allNodeIds],
      interruptible: true,
    },
  }));
},
```

这里必须打开固定右侧工作区，不能创建独立浮动面板。

### 6.2 `Esc` 的顺序

在 `App.tsx` 中只注册一次键盘监听：

1. 搜索打开时先关搜索。
2. 工作区打开时先关工作区，但保留节点选择。
3. 再按一次清除节点选择，回到当前目标。
4. 没有选择时不做任何动作。

### 6.3 本地存储版本

使用新 key：

```ts
const STORAGE_KEY = 'knowledge-universe:v5';
```

只持久化：

```ts
{
  version: 5,
  profile,
  selectedGoalId,
  qualityPreference,
}
```

不要持久化面板是否打开、节点 hover、相机坐标或临时帧率。

---

## 7. Windows 性能预算

### 7.1 当前问题的真实来源

当前实现对 336 个节点逐个创建核心、细胞膜、光晕网格，并为每个节点注册 `useFrame`。每条边也各自拥有几何、材质和逐帧更新；标签使用多个 Drei `Html`；Canvas 最高 1.75 DPR，再叠加 Bloom、Noise、Vignette 全屏后期。Windows 4K 缩放屏或核显会同时遇到：

- 上千次 draw call。
- 数百个 React Three Fiber 帧回调。
- 选择和 hover 时的全图对象重建。
- 曲线在节点移动期间反复重写 BufferGeometry。
- 高 DPR 带来的数百万额外像素。
- 全屏后期处理的额外 framebuffer 成本。

### 7.2 V5 强制预算

| 项目 | 目标上限 |
|---|---:|
| WebGL draw call | 15 |
| `useFrame` 回调 | 4 |
| Three.js geometry | 10 |
| Three.js texture | 4 |
| 常驻 DOM 节点标签 | 12 |
| 单次选择主线程长任务 | 100 ms 内不得出现 |
| 节点选择到视觉反馈 | 100 ms 内 |
| 相机输入响应 | 50 ms 内 |
| 1920 × 1080 核显中位 FPS | 45 以上 |
| 1920 × 1080 独显中位 FPS | 55 以上 |
| 4K 自动画质最低 FPS | 30 以上 |

### 7.3 画质档位

`src/performance/types.ts`：

```ts
export interface QualityConfig {
  tier: ResolvedQualityTier;
  maxRenderPixels: number;
  minDpr: number;
  maxDpr: number;
  curveSegments: number;
  maxLabels: number;
  showDormantHalos: boolean;
  bloom: boolean;
  bloomResolutionScale: number;
}
```

`src/performance/qualityPolicy.ts`：

```ts
export const QUALITY_CONFIG: Record<ResolvedQualityTier, QualityConfig> = {
  quality: {
    tier: 'quality',
    maxRenderPixels: 3_600_000,
    minDpr: 0.65,
    maxDpr: 1.5,
    curveSegments: 24,
    maxLabels: 12,
    showDormantHalos: true,
    bloom: true,
    bloomResolutionScale: 0.5,
  },
  balanced: {
    tier: 'balanced',
    maxRenderPixels: 2_400_000,
    minDpr: 0.55,
    maxDpr: 1.15,
    curveSegments: 16,
    maxLabels: 8,
    showDormantHalos: false,
    bloom: false,
    bloomResolutionScale: 0.5,
  },
  performance: {
    tier: 'performance',
    maxRenderPixels: 1_300_000,
    minDpr: 0.5,
    maxDpr: 1,
    curveSegments: 10,
    maxLabels: 5,
    showDormantHalos: false,
    bloom: false,
    bloomResolutionScale: 0.5,
  },
};

export function resolveDpr(
  cssWidth: number,
  cssHeight: number,
  deviceDpr: number,
  config: QualityConfig,
) {
  const cssPixels = Math.max(1, cssWidth * cssHeight);
  const pixelBudgetDpr = Math.sqrt(config.maxRenderPixels / cssPixels);

  return Math.min(
    deviceDpr,
    config.maxDpr,
    Math.max(config.minDpr, pixelBudgetDpr),
  );
}
```

说明：DOM 文字仍按系统分辨率绘制，只有 WebGL Canvas 降低内部渲染像素。因此 4K Windows 屏幕可以降到约 0.5 到 0.7 DPR，而导航和面板文字仍清晰。

### 7.4 自动降级规则

“自动”是用户默认值，不依据 Windows UA 猜设备，而依据真实帧率：

1. 初始使用 `balanced`。
2. 场景加载后的第一次镜头适配期间开始采样。
3. 使用 Drei `PerformanceMonitor`，参数固定为：

```tsx
<PerformanceMonitor
  iterations={6}
  ms={400}
  threshold={0.75}
  flipflops={3}
  bounds={() => [42, 55]}
  onDecline={handleDecline}
  onIncline={handleIncline}
  onFallback={handleFallback}
>
  {children}
</PerformanceMonitor>
```

4. 连续下降时：`quality → balanced → performance`。
5. 回升必须连续稳定 8 秒后才允许升一级，避免来回切换。
6. 用户手动选择档位后，不再自动修改。
7. 浏览器标签页隐藏时停止采样，恢复后等待 1 秒再采样。

### 7.5 Canvas 参数

`KnowledgeFieldCanvas.tsx` 必须使用：

```tsx
<Canvas
  dpr={resolvedDpr}
  frameloop="demand"
  gl={{
    alpha: false,
    antialias: resolvedQualityTier === 'quality',
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
    toneMapping: THREE.ACESFilmicToneMapping,
  }}
>
```

注意：WebGL renderer 创建后不要因为自动画质变化反复切换 `antialias`。实际代码应在首次创建时固定抗锯齿，后续只调整 DPR、标签数、曲线采样和后期效果。

### 7.6 后期处理

- `Noise` 和 `Vignette` 从 WebGL 后期处理中移除，改为两个非常轻的 CSS 伪元素。
- `balanced` 和 `performance` 不创建 `EffectComposer`。
- `quality` 只保留半分辨率 Bloom。
- 节点在没有 Bloom 时也必须靠核心、细胞膜和 Points 光晕保持可见，不能把可读性寄托在 Bloom 上。

---

## 8. 参考资源的具体用法

### 8.1 直接借鉴但必须 React 化的部分

| 本地资源 | 借鉴内容 | 用在项目哪里 | 禁止照搬 |
|---|---|---|---|
| `inspira-ui/.../animated-tabs/AnimatedTabs.vue` | 共享选中背景、短距离过渡 | `WorkspaceTabs.tsx` | Vue 代码和夸张弹簧参数 |
| `inspira-ui/.../animated-beam/AnimatedBeam.vue` | 贝塞尔控制点与沿路径进度 | 选中链路的一次性光信号 | 永久循环 Beam |
| `inspira-ui/.../blur-reveal/BlurReveal.vue` | 8 px 到 0 的受控模糊进入 | 工作区标题与详情段落 | 整页 blur 动画 |
| `gsap-skills/skills/gsap-react/SKILL.md` | `useGSAP` 作用域与销毁 | `SelectionDirector.tsx` | 全局找 DOM 节点 |
| `gsap-skills/skills/gsap-performance/SKILL.md` | 批量属性、避免布局抖动 | 面板过渡和选择时序 | 每节点独立 tween |
| `awesome-design-md/.../linear.app/DESIGN.md` | 克制黑色表面、细边界 | 工作区和导航 | 复制 Linear 品牌 |
| `awesome-design-md/.../runwayml/DESIGN.md` | 内容退到边缘，让视觉主体占据中心 | 全屏知识空间 | 视频背景 |
| `awesome-design-md/.../apple/DESIGN.md` | 字体层级、动效节制 | 全局排版和过渡 | Apple 资产 |
| `ui-ux-pro-max-skill/.../threejs.csv` | Three.js 性能和交互检查项 | Windows 验收 | 机械套模板 |

### 8.2 只借鉴思想的部分

- Marble `os-taxonomy`：借鉴依赖类型、关系原因、中心性和证据字段的思路，不复制其小学数据和文案。
- Obsidian Graph View：借鉴“节点选择后保留上下文”的空间逻辑，不复制布局或视觉皮肤。
- Awwwards Annual Awards：借鉴黑色页面的编辑节奏和界面退让，不复制具体作品。
- Karpathy 的 AI 开发思路：AI 负责解析目标、解释节点和生成路径，三维图谱继续由确定性数据和图算法驱动。

### 8.3 不进入生产运行时的参考库

Anime.js、Lottie、Aurora、Vortex、Neural Background、Liquid Glass 等内容只作为能力研究，不进入当前 bundle。项目已经有 GSAP、Motion、R3F 和 Three.js，继续增加动画运行时只会提高包体和维护成本。

---

## 9. 图谱计算层施工

这一层先完成，因为后面的渲染、命中和镜头都依赖稳定索引。

### 9.1 改造 `graph/GraphRepository.ts`

#### 目的

当前 `relevance.ts` 在 336 个节点的循环中反复扫描全部边，hover 也会触发整图重建。V5 必须把常用关系在初始化时一次性建立索引。

#### 必须提供的公开能力

```ts
class GraphRepository {
  readonly nodeById: ReadonlyMap<string, KnowledgeNode>;
  readonly edgeById: ReadonlyMap<string, KnowledgeEdge>;
  readonly nodeIndexById: ReadonlyMap<string, number>;

  hasNode(id: string): boolean;
  node(id: string): KnowledgeNode | undefined;
  incoming(id: string, types?: RelationType[]): readonly KnowledgeEdge[];
  outgoing(id: string, types?: RelationType[]): readonly KnowledgeEdge[];
  adjacent(id: string): readonly KnowledgeEdge[];
  descendants(id: string): ReadonlyMap<string, number>;
  ancestors(id: string): readonly string[];
  corridor(id: string, maxDepth?: number): CausalCorridor;
}
```

#### 索引写法

```ts
private readonly incomingByNode = new Map<string, KnowledgeEdge[]>();
private readonly outgoingByNode = new Map<string, KnowledgeEdge[]>();
private readonly adjacentByNode = new Map<string, KnowledgeEdge[]>();

constructor(data: KnowledgeGraphData) {
  this.nodeById = new Map(data.nodes.map((node) => [node.id, node]));
  this.nodeIndexById = new Map(
    data.nodes.map((node, index) => [node.id, index]),
  );
  this.edgeById = new Map(data.edges.map((edge) => [edge.id, edge]));

  for (const node of data.nodes) {
    this.incomingByNode.set(node.id, []);
    this.outgoingByNode.set(node.id, []);
    this.adjacentByNode.set(node.id, []);
  }

  for (const edge of data.edges) {
    this.incomingByNode.get(edge.target)?.push(edge);
    this.outgoingByNode.get(edge.source)?.push(edge);
    this.adjacentByNode.get(edge.source)?.push(edge);
    this.adjacentByNode.get(edge.target)?.push(edge);
  }
}
```

数组建立完成后不再修改。关系查询不得再使用 `knowledgeGraph.edges.filter` 或 `some`。

### 9.2 保留并收紧 `graph/causalCorridor.ts`

把返回值补充为：

```ts
export interface CausalCorridor {
  focusNodeId: string;
  upstreamNodeDepth: ReadonlyMap<string, number>;
  downstreamNodeDepth: ReadonlyMap<string, number>;
  lateralNodeDistance: ReadonlyMap<string, number>;
  primaryEdgeIds: ReadonlySet<string>;
  secondaryEdgeIds: ReadonlySet<string>;
  allNodeIds: ReadonlySet<string>;
  maxUpstreamDepth: number;
  maxDownstreamDepth: number;
}
```

`allNodeIds` 必须包含：当前节点、上游、下游和当前关系模式允许的横向关系。这样 Store、镜头和标签层可以共用同一个结果。

### 9.3 新建 `graph/buildSceneSnapshot.ts`

#### 输入

```ts
interface SnapshotInput {
  goalId: string | null;
  selectedNodeId: string | null;
  learningPath: readonly string[];
  relationMode: RelationMode;
  qualityTier: ResolvedQualityTier;
  revision: number;
}
```

不允许传入 `hoveredNodeId`。hover 只在渲染层用一个 ref 保存。

#### 生成步骤

1. 通过 Repository 获取当前目标的后代深度。
2. 通过 `corridor(selectedNodeId)` 获取上游和下游。
3. 按节点层级、目标相关度、关系深度计算状态。
4. 计算聚焦时的目标坐标，但不修改 `basePosition`。
5. 计算同层最近邻距离并限制光晕半径。
6. 按标签优先级排序，只返回当前画质允许的标签 id。
7. 通过 `nodeIndexById` 把边转换成整数索引，供 TypedArray 使用。

#### 标签优先级

```ts
function labelPriority(node: KnowledgeNode, state: VisualState) {
  if (state === 'selected') return 100;
  if (state === 'upstream' || state === 'downstream') return 80;
  if (node.type === 'goal' || node.type === 'direction') return 60;
  if (state === 'lensActive' && ['course', 'skill'].includes(node.type)) return 50;
  return 0;
}
```

同分时按屏幕深度和节点 id 稳定排序，不能每次选择都跳动。

#### 复杂度要求

- 初始化索引：`O(N + E)`。
- 一次节点选择生成 snapshot：`O(N + E)`。
- 一次 hover：不得生成 snapshot，目标为 `O(N)` 屏幕命中或使用缓存屏幕坐标。

### 9.4 新建 `graph/curveBuffers.ts`

#### 曲线规则

每条边使用三次贝塞尔：

```ts
function controlPoints(
  source: THREE.Vector3,
  target: THREE.Vector3,
  relationType: RelationType,
) {
  const deltaY = target.y - source.y;
  const horizontal = new THREE.Vector3(
    target.x - source.x,
    0,
    target.z - source.z,
  );
  const bend = Math.min(4.8, Math.max(0.9, horizontal.length() * 0.16));
  const normal = new THREE.Vector3(-horizontal.z, 0, horizontal.x)
    .normalize()
    .multiplyScalar(deterministicSign(source, target) * bend);

  const c1 = source.clone().lerp(target, 0.33).add(normal);
  const c2 = source.clone().lerp(target, 0.66).add(normal);

  if (Math.abs(deltaY) > 1) {
    c1.y = source.y + deltaY * 0.28;
    c2.y = source.y + deltaY * 0.72;
  }

  return [c1, c2] as const;
}
```

`deterministicSign` 根据 edge id hash 返回 `-1` 或 `1`，保证刷新后曲线不改变。

#### Buffer 结构

背景关系和活动关系分别构建一个 `BufferGeometry`：

```ts
interface EdgeBufferSet {
  positions: Float32Array;
  colors: Float32Array;
  progress: Float32Array;
  delays: Float32Array;
  edgeCount: number;
}
```

每段曲线按画质采样 10、16 或 24 段。使用 `LineSegments`，所有背景边只占一次 draw call，所有活动边只占一次 draw call。

### 9.5 新建 `graph/picking.ts`

这是“所有光点都能点击”的关键。不要继续依赖球体真实半径。

```ts
export interface ScreenPoint {
  id: string;
  x: number;
  y: number;
  depth: number;
  relevance: number;
}

export function pickNodeAtScreenPoint(
  points: readonly ScreenPoint[],
  clientX: number,
  clientY: number,
  hitRadius: number,
) {
  let best: { id: string; score: number } | null = null;

  for (const point of points) {
    const distance = Math.hypot(point.x - clientX, point.y - clientY);
    if (distance > hitRadius) continue;

    const score =
      distance +
      Math.max(0, point.depth) * 3 -
      point.relevance * 4;

    if (!best || score < best.score) best = { id: point.id, score };
  }

  return best?.id ?? null;
}
```

测试必须覆盖：

- 命中半径内返回最近节点。
- 两个节点重叠时优先前方节点。
- 同深度时优先相关度更高的节点。
- 半径外返回 `null`。

---

## 10. 三维场景施工

### 10.1 新建 `scene/KnowledgeFieldCanvas.tsx`

#### 职责

- 创建唯一 Canvas。
- 计算有效 DPR。
- 处理 WebGL 创建失败和上下文丢失。
- 挂载性能监控、三维场景和屏幕投影桥。
- 不直接 map 336 个节点。

#### 组件骨架

```tsx
export function KnowledgeFieldCanvas({ snapshot }: Props) {
  const quality = useResolvedQuality();
  const [webglFailed, setWebglFailed] = useState(false);
  const resolvedDpr = useResolvedDpr(quality);

  if (webglFailed) return <WebGLFallback />;

  return (
    <div className="canvas-layer">
      <Canvas
        dpr={resolvedDpr}
        frameloop="demand"
        gl={createRendererOptions(quality)}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            'webglcontextlost',
            handleContextLost,
            { once: true },
          );
        }}
        fallback={<WebGLFallback />}
      >
        <PerspectiveCamera
          makeDefault
          fov={44}
          near={0.1}
          far={320}
          position={[45, 33, 56]}
        />

        <PerformanceGovernor>
          <KnowledgeField snapshot={snapshot} quality={quality} />
        </PerformanceGovernor>
      </Canvas>
    </div>
  );
}
```

`WebGLFallback` 使用普通黑色背景和一条正常文案：“当前设备无法启动三维视图，请更新浏览器或开启硬件加速。”

### 10.2 新建 `scene/KnowledgeField.tsx`

组件树固定为：

```tsx
export function KnowledgeField({ snapshot, quality }: Props) {
  return (
    <>
      <color attach="background" args={['#050606']} />
      <fog attach="fog" args={['#090b0b', 64, 176]} />

      <BatchedKnowledgeEdges snapshot={snapshot} quality={quality} />
      <InstancedKnowledgeNodes snapshot={snapshot} quality={quality} />
      <CameraRig snapshot={snapshot} />
      <SceneInteraction snapshot={snapshot} />
      <ScreenProjectionBridge snapshot={snapshot} />
      <SelectionDirector snapshot={snapshot} />
      <PostEffects quality={quality} />
    </>
  );
}
```

删除场景内所有 `ambientLight`、`directionalLight`、`pointLight` 和 `hemisphereLight`。节点使用 `MeshBasicMaterial` 和自定义 Shader，不受这些灯光影响，保留灯光只浪费遍历成本。

### 10.3 新建 `scene/InstancedKnowledgeNodes.tsx`

#### 架构

只创建三组批量对象：

1. `coreMesh`：所有节点核心，一个 `InstancedMesh`。
2. `membraneMesh`：所有节点细胞膜，一个 `InstancedMesh`。
3. `haloPoints`：所有节点光晕，一个 `Points` 和自定义 shader。

另允许一个单独的 `selectedRing`。总 draw call 不超过 4。

#### 几何共享

```ts
const NODE_GEOMETRY = new THREE.SphereGeometry(1, 12, 8);
```

不要在组件内为每个节点 `new SphereGeometry`。

#### 批量更新

```tsx
const coreRef = useRef<THREE.InstancedMesh>(null);
const membraneRef = useRef<THREE.InstancedMesh>(null);
const matrix = useMemo(() => new THREE.Matrix4(), []);
const color = useMemo(() => new THREE.Color(), []);

useLayoutEffect(() => {
  if (!coreRef.current || !membraneRef.current) return;

  snapshot.nodes.forEach((node, index) => {
    matrix.compose(
      vectorFromTuple(node.position),
      IDENTITY_QUATERNION,
      SCALE.setScalar(node.coreRadius),
    );
    coreRef.current!.setMatrixAt(index, matrix);
    coreRef.current!.setColorAt(index, color.set(node.color));

    matrix.compose(
      vectorFromTuple(node.position),
      IDENTITY_QUATERNION,
      SCALE.setScalar(node.membraneRadius),
    );
    membraneRef.current!.setMatrixAt(index, matrix);
    membraneRef.current!.setColorAt(index, color.set(node.color));
  });

  coreRef.current.instanceMatrix.needsUpdate = true;
  membraneRef.current.instanceMatrix.needsUpdate = true;
  if (coreRef.current.instanceColor) coreRef.current.instanceColor.needsUpdate = true;
  if (membraneRef.current.instanceColor) membraneRef.current.instanceColor.needsUpdate = true;
  invalidate();
}, [snapshot.revision]);
```

选择过渡不能为 336 个节点分别启动 tween。`SelectionDirector` 只维护一个 0 到 1 的进度值，本组件在最多一个 `useFrame` 中按 TypedArray 统一插值。

#### 材质

核心：

```tsx
<meshBasicMaterial
  toneMapped={false}
  transparent
  depthWrite={false}
  blending={THREE.AdditiveBlending}
/>
```

细胞膜：

```tsx
<meshBasicMaterial
  toneMapped={false}
  transparent
  opacity={0.16}
  depthWrite={false}
  blending={THREE.NormalBlending}
/>
```

高、均衡和性能档都保留核心。性能档只隐藏无关节点的 halo，不能隐藏节点本体。

### 10.4 新建 `scene/BatchedKnowledgeEdges.tsx`

#### 基础结构

```tsx
export function BatchedKnowledgeEdges({ snapshot, quality }: Props) {
  const buffers = useMemo(
    () => buildEdgeBuffers(snapshot, QUALITY_CONFIG[quality].curveSegments),
    [snapshot.revision, quality],
  );

  return (
    <group>
      <lineSegments geometry={buffers.backgroundGeometry}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </lineSegments>

      <lineSegments
        ref={activeLinesRef}
        geometry={buffers.activeGeometry}
        material={activeSignalMaterial}
      />
    </group>
  );
}
```

#### 一次性传播 Shader

活动线顶点属性至少包含 `aPathProgress` 和 `aDelay`。fragment 中只在选择动画期间计算亮头：

```glsl
float localProgress = clamp((uProgress - aDelay) / 0.22, 0.0, 1.0);
float head = 1.0 - smoothstep(0.0, 0.16, abs(aPathProgress - localProgress));
float trail = smoothstep(localProgress - 0.48, localProgress, aPathProgress);
float alpha = baseAlpha + head * 0.74 + trail * 0.12;
```

`uProgress` 到 1 后固定，不继续循环。

#### 几何更新时机

只在以下情况重建 edge buffer：

- 选择目标改变。
- 选择节点改变。
- 关系模式改变。
- 画质档位改变曲线段数。

hover、面板滚动、文字展开和相机旋转都不得重建曲线。

### 10.5 新建 `scene/CameraRig.tsx`

#### 必须替换 OrbitControls 的原因

当前实现每帧把相机位置和 target 写回自动路径，用户拖动产生的结果下一帧被覆盖。V5 使用 Drei `CameraControls` 的原生过渡方法，不再由 GSAP 每帧改相机坐标。

#### 操作映射

- 左键拖动：Orbit。
- 右键拖动：Truck / Pan。
- 滚轮：Dolly。
- 单指：Rotate。
- 双指：Truck + Dolly。

#### 组件骨架

```tsx
import {
  CameraControls,
  type CameraControlsImpl,
} from '@react-three/drei';

export function CameraRig({ snapshot }: Props) {
  const controls = useRef<CameraControlsImpl>(null);
  const command = useKnowledgeStore((state) => state.cameraCommand);
  const panelMetrics = usePanelMetrics();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;

    const box = boxForNodeIds(command.nodeIds, snapshot);
    const padding = worldPaddingForPanel(box, panelMetrics);

    void instance.fitToBox(box, !reducedMotion, {
      paddingTop: padding.top,
      paddingRight: padding.right,
      paddingBottom: padding.bottom,
      paddingLeft: padding.left,
    });
  }, [command.id, snapshot.revision, panelMetrics.width]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={5}
      maxDistance={170}
      minPolarAngle={0.18}
      maxPolarAngle={1.62}
      smoothTime={0.48}
      draggingSmoothTime={0.12}
      dollySpeed={0.85}
      truckSpeed={1}
      azimuthRotateSpeed={0.72}
      polarRotateSpeed={0.64}
      onControlStart={() => controls.current?.stop()}
    />
  );
}
```

`worldPaddingForPanel` 不能把 CSS px 直接传给 `fitToBox`。它先计算包围盒宽度，再按面板占 Canvas 的比例换算为世界单位：

```ts
const rightRatio = panelWidth / Math.max(1, canvasWidth - panelWidth);
const paddingRight = boxSize.x * rightRatio * 0.72;
```

移动端面板在底部时，使用 `paddingBottom`，不使用 `paddingRight`。

#### 用户打断

`onControlStart` 必须：

1. 调用 `controls.stop()` 停止过渡。
2. 通知 `SelectionDirector` 镜头部分已中断。
3. 不撤销节点选择和链路高亮。

### 10.6 新建 `scene/SceneInteraction.tsx`

#### 事件区分

在 Canvas DOM 元素上记录 pointer down 和 pointer up：

```ts
const DRAG_THRESHOLD_PX = 5;

onPointerDown(event) {
  pointerStart.current = {
    x: event.clientX,
    y: event.clientY,
    id: event.pointerId,
  };
}

onPointerUp(event) {
  const start = pointerStart.current;
  if (!start || start.id !== event.pointerId) return;

  const moved = Math.hypot(
    event.clientX - start.x,
    event.clientY - start.y,
  );

  if (moved > DRAG_THRESHOLD_PX) return;

  const radius = event.pointerType === 'touch' ? 22 : 14;
  const nodeId = pickNodeAtScreenPoint(
    screenPointsRef.current,
    event.clientX,
    event.clientY,
    radius,
  );

  if (nodeId) selectNode(nodeId);
}
```

鼠标移动时最多以 30 Hz 更新 hover。使用 `requestAnimationFrame` 或时间戳节流，不把每次 pointermove 写进 Zustand。

#### 空白点击

空白点击只清除 hover，不关闭当前选择。用户可以按 `Esc` 或点击“全部知识”离开。这样拖动后的轻微误差不会导致详情消失。

### 10.7 新建 `scene/ScreenProjectionBridge.tsx`

职责：

- 把 336 个世界坐标投影为屏幕坐标。
- 把结果写入共享 ref，供 picking 使用。
- 只把当前 `labelNodeIds` 的坐标送到 React DOM 标签层。
- 相机静止时停止更新。

更新频率：

- 相机拖动或自动过渡：30 Hz。
- 相机静止：不更新。
- snapshot 改变：立即更新一次。

不要再为每个节点使用 Drei `<Html>`。

### 10.8 新建 `scene/PostEffects.tsx`

```tsx
export function PostEffects({ quality }: Props) {
  if (!QUALITY_CONFIG[quality].bloom) return null;

  return (
    <EffectComposer multisampling={0} resolutionScale={0.5}>
      <Bloom
        intensity={0.52}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.24}
        mipmapBlur
      />
    </EffectComposer>
  );
}
```

禁止重新加入 `Noise` 和 `Vignette`。

---

## 11. 统一选择动画施工

### 11.1 新建 `animation/motionTokens.ts`

```ts
export const MOTION = {
  easeOut: 'power3.out',
  cssEaseOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  nodeConfirm: 0.12,
  contextDim: 0.22,
  propagation: 0.6,
  cameraFit: 0.64,
  panelReveal: 0.3,
  textStagger: 0.045,
} as const;
```

### 11.2 新建 `animation/SelectionDirector.tsx`

只允许一个选择时间线：

```tsx
export function SelectionDirector({ snapshot }: Props) {
  const selectionEpoch = useKnowledgeStore((state) => state.selectionEpoch);
  const invalidate = useThree((state) => state.invalidate);
  const progress = useSelectionProgressRef();

  useGSAP(() => {
    if (!selectionEpoch) return;

    const timeline = gsap.timeline({
      defaults: { ease: MOTION.easeOut },
      onUpdate: invalidate,
    });

    progress.current.node = 0;
    progress.current.context = 0;
    progress.current.propagation = 0;

    timeline
      .to(progress.current, { node: 1, duration: 0.12 }, 0)
      .to(progress.current, { context: 1, duration: 0.14 }, 0.08)
      .to(progress.current, { propagation: 1, duration: 0.6 }, 0.12);

    return () => timeline.kill();
  }, { dependencies: [selectionEpoch], revertOnUpdate: true });

  return null;
}
```

Camera Controls 自己负责镜头，不加入 GSAP timeline。工作区使用 CSS/Motion 进入。三者共享开始时间即可，不互相逐帧写状态。

### 11.3 动画停止条件

任一条件成立都停止逐帧渲染：

- GSAP timeline 完成。
- Camera Controls 触发 `rest`。
- 没有 hover 变化。
- 没有画质切换。

Canvas 使用 `frameloop="demand"`，所以静止界面不会持续占用 GPU。

---

## 12. 界面组件施工

### 12.1 新建 `components/navigation/TopNavigation.tsx`

#### DOM 结构

```tsx
<header className="top-navigation">
  <button className="brand" onClick={showAllKnowledge}>
    <strong>知识宇宙</strong>
    <span>336 个知识节点</span>
  </button>

  <nav aria-label="主要操作">
    <NavAction icon={MagnifyingGlass} label="搜索" shortcut="/" />
    <NavAction icon={Target} label="选择目标" />
    <NavAction icon={TreeStructure} label="浏览知识" />
    <NavAction icon={Path} label="学习计划" />
    <NavAction icon={CornersOut} label="适配全景" />
  </nav>
</header>
```

每个按钮必须有 `aria-label` 和可见键盘焦点。不要依赖 hover tooltip 传递唯一信息。

### 12.2 新建 `components/workspace/WorkspacePanel.tsx`

#### 单例原则

`App.tsx` 只渲染一个 `WorkspacePanel`。组件内部读取 `workspaceMode`，自身决定当前内容，避免 App 和面板同时维护一份分支逻辑：

```tsx
export function WorkspacePanel() {
  const mode = useKnowledgeStore((state) => state.workspaceMode);

  return (
    <AnimatePresence>
      {mode && (
        <motion.aside key="workspace" className="workspace-panel">
          {mode === 'goal' && <GoalSelector />}
          {mode === 'browse' && <KnowledgeBrowser />}
          {mode === 'node' && <NodeDetails />}
          {mode === 'plan' && <LearningPlan />}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
```

注意 `key` 固定为 `workspace`，这样内容切换不会让整个面板从另一个位置重新出现。

#### 进入动画

桌面：

```ts
initial: { opacity: 0, clipPath: 'inset(0 0 100% 0)' }
animate: { opacity: 1, clipPath: 'inset(0 0 0% 0)' }
exit: { opacity: 0, clipPath: 'inset(0 0 8% 0)' }
transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
```

移动端只从底部移动 16 px，不从屏幕外大幅飞入。

### 12.3 新建 `WorkspaceTabs.tsx`

顶部只在 `goal` 和 `browse` 之间显示两个 tab：

- 选择目标
- 浏览知识

复用 Inspira AnimatedTabs 的“共享背景”思想，但用 Motion `layoutId="workspace-tab"` 重写：

```tsx
{active && (
  <motion.span
    layoutId="workspace-tab"
    className="workspace-tabs__active"
    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
  />
)}
```

选中背景是 `rgb(255 255 255 / 0.07)`，没有彩色发光。

### 12.4 新建 `GoalSelector.tsx`

#### 布局顺序

1. 标题“选择目标”。
2. 一句话说明：“选择一个方向，系统会突出相关知识并保留其他内容作为背景。”
3. 四个目标行：计算机考研 408、AI 工程、游戏开发、前端开发。
4. 自然语言输入：“例如：我要准备计算机考研 408”。
5. 可折叠的用户信息：专业、身份。默认折叠，避免重新制造开屏表单。

每个目标是 52 px 高的整行按钮，不是大卡片。左侧 7 px 域色圆点，中间名称，右侧节点数量和箭头。

### 12.5 新建 `KnowledgeBrowser.tsx`

#### 功能

- 显示四个方向。
- 展开后显示该方向的课程和技能。
- 点击课程直接选中对应三维节点并打开节点详情。
- 列表只是快速定位工具，不取代三维探索。

列表行高度 44 px，层级缩进每级 14 px。不要使用传统目录树的竖线和文件夹图标。

### 12.6 新建 `NodeDetails.tsx`

#### 固定内容顺序

1. 类型和所属方向。
2. 节点名称。
3. 面包屑路径。
4. 解释。
5. 前置知识。
6. 后续知识。
7. 相关知识。
8. 推荐学习内容。
9. “AI 讲解”和“加入学习计划”两个文本操作。

#### 文案替换表

| 旧文案 | 新文案 |
|---|---|
| 目标透镜 | 选择目标 |
| 知识地图 / 知识星图 | 浏览知识 |
| 因果走廊 | 知识关系 |
| 上游前置 | 前置知识 |
| 下游解锁 | 后续知识 |
| 横向关联 | 相关知识 |
| AI 学习解释 | AI 讲解 |
| 生成学习路径 | 生成学习计划 |
| 本地知识服务 | 删除，不显示 |

关系按钮点击后必须选择相应节点，不能只改变文字。

### 12.7 新建 `LearningPlan.tsx`

- 标题“学习计划”。
- 显示当前目标。
- 显示按顺序生成的节点列表。
- “生成学习计划”是正常按钮，不使用魔法棒、闪光和渐变。
- 点击计划中的节点时选择该三维节点，并把镜头适配到它的关系链。

### 12.8 新建 `SearchCommand.tsx`

搜索框固定在顶部导航下方居中：

```text
top: 74px
left: 50%
width: min(560px, calc(100vw - 32px))
transform: translateX(-50%)
```

搜索结果最多 8 条。每条显示节点名、类型、所属方向。键盘支持上下键、Enter 和 Esc。选择结果后：

1. 关闭搜索。
2. 选中三维节点。
3. 打开固定工作区的节点详情。
4. 点亮完整上下游关系。

### 12.9 新建 `scene-ui/SceneToolbar.tsx`

桌面文案：

```text
拖动旋转 · 右键平移 · 滚轮缩放
```

后面是两个按钮：

- 全部知识
- 性能

“性能”弹出简单菜单：自动、高画质、均衡、性能优先。显示当前解析档位，例如“自动 · 均衡”。

### 12.10 新建 `scene-ui/NodeLabelLayer.tsx`

接收 `ProjectedLabel[]`：

```ts
interface ProjectedLabel {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
  state: VisualState;
}
```

只渲染画质策略允许的标签。DOM 写法：

```tsx
<span
  className={`node-label node-label--${label.state}`}
  style={{ transform: `translate3d(${label.x}px, ${label.y}px, 0)` }}
>
  {label.name}
</span>
```

不要使用 React state 在每帧保存 336 个投影点。投影桥只以 30 Hz 提交少量标签坐标。

---

## 13. 样式施工

### 13.1 `styles/fonts.css`

```css
@font-face {
  font-family: "Instrument Sans";
  src: url("/fonts/InstrumentSans-Regular.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Instrument Sans";
  src: url("/fonts/InstrumentSans-Bold.ttf") format("truetype");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: "Geist Mono";
  src: url("/fonts/GeistMono-Regular.ttf") format("truetype");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}
```

复制字体时一并保留 OFL 文件到 `public/fonts/LICENSES/`。

### 13.2 `styles/reset.css`

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { width: 100%; height: 100%; }
html { background: #050606; color-scheme: dark; }
body { margin: 0; overflow: hidden; }
button, input, textarea { font: inherit; }
button { border: 0; cursor: pointer; }
button:focus-visible, input:focus-visible {
  outline: 1px solid rgb(255 247 230 / 0.82);
  outline-offset: 3px;
}
```

### 13.3 `styles/app-shell.css`

```css
.app-shell {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: var(--ku-bg);
  color: var(--ku-text);
  font-family: "Instrument Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-shell::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(circle at 50% 42%, transparent 38%, rgb(0 0 0 / 0.38) 100%);
}

.app-shell::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,...small-static-noise...");
}
```

噪点 SVG 必须小于 1 KB，静态、不动画。

### 13.4 `styles/workspace.css`

关键值：

```css
.workspace-panel {
  position: fixed;
  top: 78px;
  right: 24px;
  bottom: 24px;
  z-index: 60;
  display: flex;
  width: clamp(360px, 28vw, 420px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ku-rule-strong);
  border-radius: 8px;
  background: var(--ku-panel);
  backdrop-filter: blur(16px);
}

.workspace-section {
  padding: 18px;
  border-top: 1px solid var(--ku-rule);
}

.workspace-section h3 {
  margin: 0 0 10px;
  color: var(--ku-text-faint);
  font: 400 10px/1.2 "Geist Mono", monospace;
  letter-spacing: 0.06em;
}
```

只允许工作区背景使用一次 `backdrop-filter`。内部区块不得层层模糊。

### 13.5 响应式规则

`styles/responsive.css` 中必须按以下顺序写断点：

```css
@media (max-width: 1119px) { /* 中等屏幕 */ }
@media (max-width: 767px) { /* 移动端 */ }
@media (max-height: 700px) { /* 低高度屏幕 */ }
@media (prefers-reduced-motion: reduce) { /* 降低动画 */ }
@media (forced-colors: active) { /* Windows 高对比度 */ }
```

Windows 高对比度模式下：

- 按钮使用 `ButtonText`。
- 选中边框使用 `Highlight`。
- 不依赖透明度区分唯一状态。

---

## 14. `App.tsx` 最终组装

`App.tsx` 只负责组装，不放图算法、节点动画或 AI 请求细节。

```tsx
const KnowledgeFieldCanvas = lazy(() =>
  import('./scene/KnowledgeFieldCanvas').then((module) => ({
    default: module.KnowledgeFieldCanvas,
  })),
);

export default function App() {
  const snapshotInput = useSnapshotInput();
  const snapshot = useMemo(
    () => buildSceneSnapshot(snapshotInput),
    [
      snapshotInput.goalId,
      snapshotInput.selectedNodeId,
      snapshotInput.learningPath,
      snapshotInput.relationMode,
      snapshotInput.qualityTier,
      snapshotInput.revision,
    ],
  );

  useGlobalKeyboardShortcuts();

  return (
    <main className="app-shell">
      <Suspense fallback={<CanvasFallback />}>
        <KnowledgeFieldCanvas snapshot={snapshot} />
      </Suspense>

      <NodeLabelLayer />
      <TopNavigation />
      <SearchCommand />
      <WorkspacePanel />
      <SceneToolbar />
      {import.meta.env.DEV && <PerformanceHud />}
    </main>
  );
}
```

删除 `OnboardingScreen` 的使用。用户资料仍可从“选择目标”中的折叠区录入。

---

## 15. 开发性能工具

### 15.1 新建 `performance/PerformanceHud.tsx`

仅当开发环境并且 URL 含 `?perf=1` 时显示：

```text
FPS 56
Frame 17.8 ms
Calls 9
Triangles 18.4k
Geometries 7
Textures 1
DPR 1.08
Tier balanced
```

数据来源：

```ts
gl.info.render.calls
gl.info.render.triangles
gl.info.memory.geometries
gl.info.memory.textures
gl.getPixelRatio()
```

每 500 ms 更新一次 DOM，不要每帧 setState。

### 15.2 生产环境

- `PerformanceHud` 必须被 Tree Shaking 移除或返回 `null`。
- 不加载 stats.js 面板。
- 不在控制台持续打印帧率。

---


## 16. 分批施工顺序

不得同时重写 Store、场景和 UI。每个批次都有明确入口、操作和退出条件。

### 批次 0：保护现状并记录基线

1. 不清理当前 dirty worktree，不删除 Playwright 截图和用户改动。
2. 依次运行：

```bash
npm run typecheck
npm test
npm run build
```

3. 启动项目：

```bash
npm run dev -- --host 0.0.0.0
```

4. 用 Chrome 或 Edge 打开 `http://localhost:5173/?perf=1`。
5. 记录全景、选择 408、选择“线性表”三个状态的 FPS、draw call、DPR。
6. 保存一组 1440 × 900 和 390 × 844 截图。

退出条件：明确记录 336 个节点和 646 条边；三项工程命令结果已保存；当前页面仍可作为回归对照。

### 批次 1：建立类型、索引和画质策略

创建：

```text
performance/types.ts
performance/qualityPolicy.ts
performance/qualityPolicy.test.ts
graph/buildSceneSnapshot.ts
graph/picking.ts
```

修改：

```text
graph/types.ts
graph/GraphRepository.ts
graph/causalCorridor.ts
```

画质策略测试至少包含：

```ts
describe('quality policy', () => {
  it('limits a 4K canvas by pixel budget', () => {
    const dpr = resolveDpr(3840, 2160, 2, QUALITY_CONFIG.balanced);
    expect(dpr).toBeLessThan(0.7);
  });

  it('never exceeds the tier maximum', () => {
    const dpr = resolveDpr(1366, 768, 2, QUALITY_CONFIG.performance);
    expect(dpr).toBeLessThanOrEqual(1);
  });
});
```

退出条件：Repository 查询不再扫描全部边；`buildSceneSnapshot` 不接受 hover；现有图谱测试继续通过；DPR 测试覆盖 1080p、1440p 和 4K。

### 批次 2：先修相机，不动视觉

1. 创建 `scene/CameraRig.tsx`。
2. 让旧 `UniverseCanvas.tsx` 暂时挂载新 CameraRig。
3. 删除旧 CameraController 的使用，但先保留文件。
4. 依次检查左键旋转、右键平移、滚轮缩放。
5. 选择节点，在自动适配期间立刻拖动。
6. 检查自动适配停止，选择和右侧内容仍保留。
7. 拖动后继续缩放，不能出现相机弹回。

退出条件：所有检查通过；CameraRig 中没有持续写 camera position 的 `useFrame`；用户操作可以中断 `fitToBox`。

### 批次 3：建立单一工作区

创建导航、搜索和 `components/workspace/` 下的全部组件，修改 Store 与 App。旧 Drawer、Inspector 和 Dock 先保留文件，但从组件树移除。

退出条件：桌面大型面板只在右侧；移动端只在底部；浏览知识不会更改目标；页面无开屏确认、无顶部方向标题、无旧文艺文案。

### 批次 4：替换节点渲染和命中

创建：

```text
scene/InstancedKnowledgeNodes.tsx
scene/SceneInteraction.tsx
scene/ScreenProjectionBridge.tsx
components/scene-ui/NodeLabelLayer.tsx
```

施工内容：

1. 用共享几何和批量材质替换 336 个 `KnowledgeNodeMesh`。
2. 用统一屏幕空间 picking 替换小球 raycast。
3. 将 hover 从 App 和 Snapshot 依赖中移除。
4. 标签从 Drei Html 迁到单一 DOM Layer。

开发模式允许提供只读调试接口：

```ts
window.__KU_DEBUG__ = {
  getProjectedNode: (id: string) => projectedById.get(id),
  getSelectedNodeId: () => useKnowledgeStore.getState().selectedNodeId,
  getRendererInfo: () => renderer.info,
};
```

生产构建不得暴露这个对象。

退出条件：脚本依次点击 336 个节点投影坐标时全部成功；拖动超过 5 px 不误触；视觉节点 draw call 不超过 4；hover 不重建 snapshot；标签符合画质上限。

### 批次 5：替换 646 条曲线

1. 创建 `graph/curveBuffers.ts` 和 `scene/BatchedKnowledgeEdges.tsx`。
2. 生成背景曲线批次。
3. 生成活动曲线批次。
4. 验证所有曲线起点和终点。
5. 加入一次性传播 uniform。
6. 删除所有 edge 级 `useFrame`。

退出条件：背景边 1 次 draw call；活动边 1 次 draw call；曲线弧度清晰；“线性表”的上下层同时出现活动边；连续选择 20 个节点后 geometry 数量不增长。

### 批次 6：接入统一动效

1. 创建 `animation/motionTokens.ts` 和 `animation/SelectionDirector.tsx`。
2. 三维节点和曲线只读取统一进度。
3. CameraRig 独立读取 CameraCommand。
4. WorkspacePanel 独立执行内容过渡。
5. 新选择到来时 kill 旧 GSAP timeline。
6. 动画结束后停止 invalidate。

退出条件：连续快速点击 20 个节点无残留；动效能读出“前置 → 当前 → 后续”；静止后停止 WebGL 刷新；Reduced Motion 直接进入最终状态。

### 批次 7：接入 Windows 自适应性能

1. 创建 `PerformanceGovernor.tsx`、`PerformanceHud.tsx` 和 `PostEffects.tsx`。
2. Canvas 改为 demand rendering。
3. DPR 使用像素预算。
4. 自动画质初始为 balanced。
5. 接入 PerformanceMonitor。
6. Bloom 只在 quality 档挂载。
7. Noise 和 Vignette 改 CSS。
8. 设置中加入自动、高画质、均衡、性能优先。

退出条件：4K 不以 1.75 DPR 创建缓冲区；Intel 集显掉帧时自动降级；低画质保留全部节点和活动关系；自动档不来回闪烁；页面隐藏时停止采样和动画。

### 批次 8：删除旧架构并收口样式

只有前七批全部通过后才删除旧 CameraController、KnowledgeNodeMesh、KnowledgeCurves、ScreenAnchorTracker、GoalLensDrawer、KnowledgeAtlasDrawer、NodeInspector、CausalCorridorDock 和 OnboardingScreen。

退出条件：`rg` 搜索不到旧组件导入；页面没有重复面板或快捷键；CSS 没有孤立类名；生产构建不含旧模块。

### 批次 9：最终验证

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

四项全部通过后，再执行 Windows 实机测试。

---

## 17. 自动化测试施工

### 17.1 单元测试

新增：

```text
src/graph/picking.test.ts
src/graph/buildSceneSnapshot.test.ts
src/performance/qualityPolicy.test.ts
src/store/knowledgeStore.test.ts
```

必须覆盖：目标选择不等于浏览路径；任意节点走廊包含自己、上游和下游；关系模式不破坏基础走廊；DPR 不超过像素预算；自动降级有冷却时间；picking 能区分点击和拖动。

### 17.2 Playwright 用例

新增：

```text
e2e/knowledge-workspace.spec.ts
e2e/camera-controls.spec.ts
e2e/node-picking.spec.ts
e2e/performance-mode.spec.ts
```

#### 相机用例

1. 记录初始 quaternion，左键拖动 180 px，检查 quaternion 改变。
2. 记录初始 distance，滚轮缩放，检查 distance 改变。
3. 右键拖动，检查 target 改变。
4. 点击节点并立刻拖动，检查选中节点仍存在且相机不弹回。

#### 全节点命中用例

1. 读取 20 个不同方向、层级和类型的节点投影点。
2. 逐一点击，每次检查工作区标题等于节点名。
3. 覆盖 goal、direction、course、skill、knowledge、practice 六种类型。
4. 全量 336 节点测试放在发布前完整运行。

#### 工作区用例

1. 确认无开屏。
2. 选择 408，确认目标改变。
3. 打开浏览知识，确认目标仍为 408。
4. 从浏览列表选择“线性表”。
5. 确认面板位置不变，前置和后续知识均非空。
6. 按 Esc 关闭工作区，再按 Esc 清除节点。

#### 性能模式用例

1. 选择性能优先。
2. DPR 不超过 1，Bloom 未挂载，标签不超过 5。
3. 节点总数仍为 336。
4. 选择节点后活动上下游边仍完整。

### 17.3 截图矩阵

保存 390 × 844、768 × 1024、1366 × 768、1440 × 900、1920 × 1080、2560 × 1440 六种尺寸，分别覆盖全部知识、408、线性表完整关系、选择目标工作区和移动端详情 Sheet。

---

## 18. Windows 实机测试矩阵

| 系统和设备 | 视口 | 自动档预期 | 最低通过值 |
|---|---|---|---|
| Windows 10，Intel HD 630，8 GB | 1366 × 768 | 性能优先 | 平均 30 FPS，交互无冻结 |
| Windows 11，Intel UHD 620，8 GB | 1920 × 1080 | 性能优先 | 平均 30 FPS，p95 小于 38 ms |
| Windows 11，Intel Iris Xe，16 GB | 1920 × 1080，125% | 均衡 | 中位 45 FPS，p95 小于 28 ms |
| Windows 11，RTX 2060/3060 | 2560 × 1440 | 高画质 | 中位 55 FPS，p95 小于 20 ms |
| Windows 11，RTX 4060 | 3840 × 2160，150% | 高或均衡 | 中位 45 FPS，DPR 自动受限 |
| Windows Surface 触控设备 | 触控视口 | 性能或均衡 | 单指旋转、双指缩放、点击准确 |
| 远程桌面或 SwiftShader | 任意 | 性能优先 | 不崩溃，能完成核心流程 |

每台设备固定执行：首次打开；旋转 30 秒；缩放 20 次；右键平移四个区域；随机点击 100 个节点；四目标各切换 10 次；打开关闭工作区 50 次；切换 100%、125%、150% 页面缩放；跨显示器拖动；最小化 30 秒；持续运行 10 分钟。

记录模板：

```text
浏览器版本：
GPU：
系统缩放：
视口：
自动解析档位：
有效 DPR：
全景中位 FPS：
传播中位 FPS：
p95 frame time：
Draw calls：
Geometries：
Textures：
100 次点击失败数：
10 分钟内存变化：
控制台错误：
```

若不达标，依次降低 DPR、关闭 Bloom、降低背景曲线采样、减少非活动标签、隐藏无关 halo、只保留 hierarchy 背景边。绝不删除当前活动关系链、禁用点击或锁死相机。

---

## 19. 最终验收清单

### 功能

- [ ] 打开直接进入三维空间，没有确认开屏。
- [ ] 左键旋转、右键平移、滚轮缩放和触控手势有效。
- [ ] 自动运镜可以被用户输入中断。
- [ ] 336 个节点全部可点击，拖动不会误触。
- [ ] 空白点击不会让详情意外消失。
- [ ] 点击节点后，上游和下游同时点亮。
- [ ] 无关节点只弱化，不删除。
- [ ] 目标选择和浏览知识不重合。
- [ ] 节点详情始终使用同一个工作区。
- [ ] AI 讲解和学习计划仍可用。

### 视觉与响应式

- [ ] 节点是发光圆点，不是暗色胶囊。
- [ ] 四个知识方向颜色可区分，光晕不黏成大光团。
- [ ] 连线是稳定曲线，传播只播放一次。
- [ ] UI 使用黑白灰，域色只属于图谱。
- [ ] 页面无大面积紫蓝渐变、厚重投影或层层玻璃。
- [ ] 文案正常直接，三维空间始终是主体。
- [ ] 1366、1440、1920、4K 和移动端构图通过。
- [ ] Windows 125% 和 150% 缩放下按钮可用。

### 性能与工程

- [ ] 正常全景 draw call 为 6 到 10，选中状态不超过 15。
- [ ] `useFrame` 回调不超过 4，geometry 不超过 10，texture 不超过 4。
- [ ] hover 不重建 SceneSnapshot，静止后 Canvas 停止持续渲染。
- [ ] 4K DPR 受像素预算限制，Windows 核显自动降级可用。
- [ ] 连续点击和切换无内存持续增长。
- [ ] typecheck、Vitest、build、Playwright 全部通过。
- [ ] 浏览器控制台 0 error。
- [ ] 旧组件清理完成，字体许可证和第三方清单已更新。

---

## 20. 风险与处理边界

- Demand Rendering 不刷新：所有 GSAP 更新和 Camera Controls 变化显式调用 `invalidate()`，完成后停止。
- Halo overdraw：均衡和性能档隐藏无关 halo，限制半径，不提高全局 Bloom。
- 重叠节点误选：评分同时使用像素距离、深度和相关度，并加入调试命中圆。
- 面板遮挡：把面板比例换算为世界空间 padding，移动端改用 bottom padding。
- 自动画质反复切换：降级约 2 秒，升级需稳定 8 秒，切档后冷却，反复三次后锁定性能档。
- 旧 CSS 干扰：新组件先用 `.ku-v5-*` 命名空间，迁移完成后删除旧规则再收敛。

---

## 21. 参考与实现依据

官方依据：

- Three.js InstancedMesh：`https://threejs.org/docs/pages/InstancedMesh.html`
- Three.js Raycaster：`https://threejs.org/docs/pages/Raycaster.html`
- Camera Controls：`https://github.com/yomotsu/camera-controls`
- R3F Demand Rendering：`https://github.com/pmndrs/react-three-fiber/discussions/1701`
- Drei CameraControls 与 PerformanceMonitor：`https://github.com/pmndrs/drei`

本地设计依据：

```text
iTeach-design-references/inspira-ui/app/components/inspira/ui/animated-tabs/AnimatedTabs.vue
iTeach-design-references/inspira-ui/app/components/inspira/ui/animated-beam/AnimatedBeam.vue
iTeach-design-references/inspira-ui/app/components/inspira/ui/blur-reveal/BlurReveal.vue
iTeach-design-references/gsap-skills/skills/gsap-react/SKILL.md
iTeach-design-references/gsap-skills/skills/gsap-performance/SKILL.md
iTeach-design-references/awesome-design-md/design-md/linear.app/DESIGN.md
iTeach-design-references/awesome-design-md/design-md/runwayml/DESIGN.md
iTeach-design-references/awesome-design-md/design-md/apple/DESIGN.md
iTeach-design-references/ui-ux-pro-max-skill/cli/assets/data/stacks/threejs.csv
```

---

## 22. 完工报告模板

```text
1. 修改文件列表
   - 新增：
   - 修改：
   - 删除：

2. 实现功能
   - 相机：
   - 全节点命中：
   - 链路点亮：
   - 统一工作区：
   - Windows 性能：

3. 技术架构
   - 图索引：
   - 批量节点：
   - 批量曲线：
   - 画质策略：

4. 启动方式
   - 开发：npm run dev
   - 构建：npm run build
   - 预览：npm run preview

5. 测试结果
   - TypeScript：
   - Vitest：
   - Playwright：
   - Windows 实机：
   - Draw call：
   - FPS：

6. 当前不足
   - 只列真实存在且已复现的问题。

7. 后续建议
   - 只列不影响当前验收的优化。
```

施工终点不是“页面看起来更炫”，而是用户可以把这个空间当成真正可操控、可理解的学习工具：每个节点都能选，每条重要关系都能读，相机永远服从用户，Windows 设备也能稳定完成整个体验。
