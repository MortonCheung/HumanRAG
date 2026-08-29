# 三维知识宇宙 Demo 施工规格 V1（待 V3 替换）

> 本文件保留早期功能与施工记录。2026-08-25 完成 Marble、Obsidian、Karpathy 原始资料研究后，产品上位约束已更新为 [knowledge-neural-space-v3-foundation.md](./knowledge-neural-space-v3-foundation.md)。凡与 V3 的黑色视觉、纯净主界面、曲线关系、空间详情和 AI 边界冲突的内容，均以 V3 为准；下一步将据此生成完整 V3 施工规格。

文档状态：可直接实施  
目标：第一次开发即达到比赛演示质量，后续只进行视觉微调与数据修订  
适用目录：/Users/morton_cheung/Desktop/AI/iTeach  
当前项目状态：尚未初始化应用工程，仅有施工文档  

---

## 1. 文档用途

这不是产品概念稿，也不是待讨论的方向列表。

执行 Agent 必须把本文视为施工合同：

1. 按本文规定的屏幕结构、尺寸、组件职责和状态机实现。
2. 不擅自改变产品流程、视觉方向、图谱层级或数据数量。
3. 不增加登录、答题、学习进度、积分、排行榜、聊天窗口或图谱编辑器。
4. 遇到实现困难时，先保留视觉和交互结果，再替换底层实现方式。
5. 只有本文明确标注“允许微调”的参数，才允许在最终视觉校准时调整。
6. 达到第 30 节的终止条件后停止扩展。

---

## 2. 从三份参考提示词学习什么

三份参考提示词是施工精度参考，不是本项目的视觉方案。

需要继承：

- 页面身份和目标明确。
- 每个区域都有位置、宽高、间距和层级。
- 每个按钮都有文案、状态和点击结果。
- 核心交互有算法、参数和清理逻辑。
- 动画有开始条件、持续时间、缓动和降级。
- 移动端不是“自动适配”，而是单独写出布局变化。
- 文件职责和组件接口在编码前确定。
- 最终验收描述的是用户实际看到的画面。

不得照搬：

- 不使用 Lithos 的鼠标圆形揭示效果。
- 不使用 NovaAI 的滚动视频抽帧和长滚动叙事。
- 不使用 Wandor 的旅游文案、视频背景或大型输入卡。
- 不把所有信息都装进玻璃卡片。
- 不使用泛紫色 AI 渐变、霓虹外发光、无意义粒子或循环漂浮。
- 不在 React state 中记录逐帧鼠标、滚动或相机数值。

---

## 3. 产品设计解读

Reading this as: a full-screen spatial learning product for students and competition judges, with a restrained Apple-like digital-space language, leaning toward React Three Fiber, deterministic graph layout, low-density HUD and motivated camera motion.

设计参数：

- DESIGN_VARIANCE: 8
- MOTION_INTENSITY: 6
- VISUAL_DENSITY: 4

视觉关键词：

- 空间
- 克制
- 冷静
- 清晰
- 有深度
- 可探索
- 非游戏化
- 非赛博朋克

视觉基准：

- 一块全屏 WebGL 空间是产品主体。
- DOM 只承担引导、控制、说明和无障碍。
- 节点和路径的变化必须解释“为什么这个知识与目标有关”。
- 镜头运动必须解释“用户现在进入了哪个知识层级”。

---

## 4. 产品身份与固定文案

浏览器标题：

知识宇宙 | Knowledge Universe

左上角产品标识：

- 主文字：知识宇宙
- 辅助英文：KNOWLEDGE UNIVERSE
- 不设计独立品牌 Logo。
- 不使用手绘 SVG。
- 若需要图标，只使用 @phosphor-icons/react。

首次引导标题：

把目标放进宇宙里

首次引导说明：

知识会根据你的方向重新排列，形成一条可以探索的学习路径。

字段：

- 专业
- 当前身份
- 学习目标

字段示例：

- 专业：软件工程
- 当前身份：本科生
- 学习目标：计算机考研408

主按钮：

生成我的知识宇宙

宇宙顶部目标标签：

当前目标

默认验收目标：

计算机考研408

全景按钮：

返回全景

设置按钮：

重新设置

详情功能按钮：

- AI 解释
- 生成学习路径

远端 AI 不可用时的状态文案：

已使用本地知识库生成

---

## 5. 技术栈与安装边界

固定技术栈：

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Three.js
- @react-three/fiber 9
- @react-three/drei 10
- Zustand
- Graphology
- graphology-traversal
- graphology-shortest-path
- Motion
- Zod
- @phosphor-icons/react
- Vitest
- React Testing Library
- Playwright

首版不安装：

- GSAP
- react-force-graph-3d
- 3d-force-graph
- r3f-forcegraph
- framer-motion-3d
- Cytoscape.js
- React Flow
- Shader 特效库
- 粒子库

初始化命令：

~~~bash
npm create vite@latest . -- --template react-ts --no-interactive
npm install three @react-three/fiber @react-three/drei zustand graphology graphology-traversal graphology-shortest-path motion zod @phosphor-icons/react
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test eslint prettier
~~~

安装后立刻锁定 package-lock.json。

package.json 脚本固定为：

~~~json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --pretty false",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
~~~

部署产物只有 `dist/`。首版按静态站点部署；只有启用远端 AI 时，服务器才额外提供第 23 节定义的同源代理端点。

---

## 6. 文件结构

~~~text
src/
  app/
    App.tsx
    AppShell.tsx
    ErrorBoundary.tsx

  components/
    onboarding/
      OnboardingScreen.tsx
      ProfileForm.tsx
      GoalSuggestions.tsx
    hud/
      UniverseHud.tsx
      BrandMark.tsx
      GoalSelector.tsx
      LayerLegend.tsx
      UniverseActions.tsx
      UniverseStatus.tsx
    detail/
      NodeDetailPanel.tsx
      NodeBreadcrumb.tsx
      RelationList.tsx
      AIExplanation.tsx
      LearningPathRibbon.tsx
    accessibility/
      AccessibleGraphNavigator.tsx
      LiveRegion.tsx
    feedback/
      InlineError.tsx
      SceneLoading.tsx
      WebGLFallback.tsx

  scene/
    KnowledgeUniverse.tsx
    UniverseCanvas.tsx
    CameraRig.tsx
    LayerGuides.tsx
    NodeLayer.tsx
    KnowledgeNode.tsx
    NodeLabel.tsx
    EdgeLayer.tsx
    ActivePath.tsx
    SelectionRing.tsx
    SceneQualityController.tsx
    materials.ts
    geometry.ts
    viewPresets.ts

  graph/
    types.ts
    schema.ts
    validate.ts
    repository.ts
    buildGraph.ts
    indexes.ts
    traversal.ts
    shortestPath.ts
    goalMatcher.ts
    relevance.ts
    layout.ts
    focusLayout.ts
    sceneModel.ts

  data/
    knowledgeGraph.ts
    aliases.ts
    recommendations.ts
    explanations.ts

  store/
    knowledgeStore.ts
    selectors.ts
    persistence.ts

  ai/
    types.ts
    KnowledgeAI.ts
    LocalKnowledgeAI.ts
    RemoteKnowledgeAI.ts
    schemas.ts
    timeout.ts
    fallback.ts

  hooks/
    useReducedMotion.ts
    useDeviceProfile.ts
    useClickWithoutDrag.ts
    useWebGLSupport.ts

  styles/
    tokens.css
    globals.css
    glass.css

  utils/
    math.ts
    ids.ts
    clamp.ts
    focusTrap.ts

  test/
    setup.ts
    fixtures.ts

tests/
  data-integrity.test.ts
  graph-traversal.test.ts
  goal-matcher.test.ts
  relevance.test.ts
  layout.test.ts
  onboarding.test.tsx
  node-detail.test.tsx
  e2e/
    core-flow.spec.ts
    mobile-flow.spec.ts
    webgl-fallback.spec.ts
~~~

App.tsx 只能装配模块，不得包含图数据、布局算法、AI 请求或 Three.js 帧循环。

---

## 7. 根节点与系统层级

根 DOM：

~~~tsx
<div
  id="knowledge-universe-app"
  className="relative min-h-[100dvh] overflow-hidden bg-[var(--ku-bg)] text-[var(--ku-text-primary)]"
>
  <UniverseCanvas />
  <AppShell />
</div>
~~~

固定 z-index：

- 0：WebGL Canvas
- 10：Canvas 上方环境遮罩
- 20：层级标记与屏幕空间引导
- 30：常驻 HUD
- 40：详情面板与学习路径
- 50：首次引导
- 60：确认对话框
- 70：错误和瞬时反馈

将这些值写入单独常量，不在组件中随意使用 z-50、z-[99]。

### 7.1 DOM 树与 Canvas 树

两棵树分开维护，禁止把 DOM 面板塞进 Three 场景，也禁止让 Three 节点直接读取表单状态。

~~~text
#knowledge-universe-app
├── UniverseCanvas                         z=0
│   └── Canvas
│       ├── color / fog / lights
│       ├── CameraControls
│       ├── CameraRig
│       ├── LayerGuides
│       └── KnowledgeUniverse
│           ├── EdgeLayer
│           ├── NodeLayer
│           ├── ActivePath
│           └── SelectionRing
└── AppShell                               pointer-events:none
    ├── UniverseHud                        pointer-events:auto
    ├── LayerLegend
    ├── UniverseStatus
    ├── LearningPathRibbon                 pointer-events:auto
    ├── NodeDetailPanel                    pointer-events:auto
    ├── AccessibleGraphNavigator
    ├── LiveRegion
    ├── OnboardingScreen                   pointer-events:auto
    └── SceneLoading / WebGLFallback       pointer-events:auto
~~~

事件优先级固定为：首次引导或错误遮罩 > 详情面板 > 目标菜单 > HUD > Canvas。所有 DOM 交互区域必须 `stopPropagation`，避免点按钮时穿透选择三维节点。`AppShell` 容器自身使用 `pointer-events:none`，只有实际控件恢复 `pointer-events:auto`。

### 7.2 关键组件契约

`UniverseCanvas`：

~~~ts
interface UniverseCanvasProps {
  sceneModel: SceneModel;
  cameraIntent: CameraIntent;
  interactionLocked: boolean;
  onHoverNode(id: string | null): void;
  onSelectNode(id: string): void;
  onCanvasClick(): void;
  onCameraSettled(intentId: string): void;
}
~~~

- 只创建 WebGL 环境并渲染 `SceneModel`。
- 不访问 localStorage，不调用 AI，不遍历 Graphology。
- Canvas 设置 `aria-hidden="true"`，等价交互由 `AccessibleGraphNavigator` 提供。

`CameraRig`：

~~~ts
interface CameraRigProps {
  intent: CameraIntent;
  reducedMotion: boolean;
  onSettled(intentId: string): void;
}
~~~

- 是相机位置和 target 的唯一写入者。
- 新 intent 先 `controls.stop()`，再从当前姿态转向新姿态。
- intent 通过递增 `intentId` 消除过期回调，只有最后一次操作能完成状态提交。

`NodeLayer`：接收已经计算好的 `SceneNode[]`，复用 geometry 和有限组材质；只把 hover、select 事件向上报告，不改变 store。

`EdgeLayer`：一次构建普通边的 `LineSegments` BufferGeometry；`ActivePath` 单独渲染少量需要方向动画的边，禁止为每条普通边创建 React 组件。

`OnboardingScreen`：管理未提交的表单草稿与字段错误；成功提交时只调用 `onSubmit(profile)`，不得自行改变节点、相机或持久化格式。

`UniverseHud`：只派发 `selectGoal`、`returnOverview`、`openOnboarding`、`generatePath` 四类意图。目标菜单打开状态可以留在组件本地，其余业务状态来自 store selector。

`NodeDetailPanel`：只读取 `NodeDetailViewModel`，不重新遍历图；点击前置或关联节点统一调用 `onNavigateNode(id)`。

`AccessibleGraphNavigator`：视觉上可隐藏但键盘可进入，展示当前可见节点列表；不得复制第二份图状态或计算逻辑。

### 7.3 派生模型边界

`graph/sceneModel.ts` 是图数据进入场景前的唯一适配层，输出：

~~~ts
interface SceneNode {
  id: string;
  type: NodeType;
  displayPosition: readonly [number, number, number];
  visualState: "inactive" | "contextual" | "active" | "selected";
  labelVisible: boolean;
}

interface SceneEdge {
  id: string;
  sourcePosition: readonly [number, number, number];
  targetPosition: readonly [number, number, number];
  relationType: RelationType;
  visualState: "inactive" | "contextual" | "active" | "selected";
}

interface SceneModel {
  nodes: readonly SceneNode[];
  edges: readonly SceneEdge[];
  selectedPathEdgeIds: ReadonlySet<string>;
}
~~~

React 组件不得自行根据 `selectedGoalId` 猜节点透明度。所有相关度、位置和路径视觉状态都在 selector 中一次派生，然后作为不可变 scene model 传入 Canvas。

---

## 8. 设计 Token

只实现一个深色主题，不在页面中途切换明暗模式。

~~~css
:root {
  --ku-bg: #080a0c;
  --ku-bg-elevated: #101417;
  --ku-surface: rgba(18, 23, 26, 0.72);
  --ku-surface-strong: rgba(18, 23, 26, 0.9);
  --ku-surface-hover: rgba(29, 36, 39, 0.82);

  --ku-text-primary: #f3f6f4;
  --ku-text-secondary: rgba(232, 238, 234, 0.72);
  --ku-text-tertiary: rgba(232, 238, 234, 0.46);

  --ku-accent: #86c9a8;
  --ku-accent-soft: rgba(134, 201, 168, 0.18);
  --ku-accent-border: rgba(134, 201, 168, 0.44);
  --ku-accent-text: #dff8eb;

  --ku-border: rgba(233, 240, 236, 0.12);
  --ku-border-strong: rgba(233, 240, 236, 0.2);
  --ku-focus: #b6ebd1;

  --ku-danger: #e09a8d;

  --ku-radius-input: 12px;
  --ku-radius-panel: 16px;
  --ku-radius-sheet: 20px;
  --ku-radius-button: 999px;

  --ku-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
~~~

颜色规则：

- 只有激活、选中、主要操作使用绿色强调色。
- 节点类型不用六种不同颜色区分。
- 类型通过尺寸、标签、外圈和空间层级区分。
- 错误色只用于真实错误。
- 不使用紫色、蓝紫渐变、彩虹边缘或霓虹外发光。

圆角规则：

- 输入 12px。
- 侧舱 16px。
- 移动端底部面板顶部 20px。
- 可操作按钮统一全圆角。

---

## 9. 字体与排版

字体：

- DOM 主字体：Geist、Noto Sans SC、PingFang SC、Microsoft YaHei、sans-serif。
- 三维中文标签：自托管 Noto Sans SC WOFF2 子集。
- 数字和坐标可使用 Geist Mono。
- 不使用 serif。
- 不从 Google Fonts 运行时加载。

建议文件：

~~~text
public/fonts/geist-sans.woff2
public/fonts/geist-mono.woff2
public/fonts/noto-sans-sc-knowledge-subset.woff2
~~~

桌面字号：

- 引导标题：52px / 1.08 / -0.045em
- 引导说明：18px / 1.6
- HUD 品牌：18px
- 顶部目标值：14px
- 详情标题：30px / 1.15
- 详情正文：14px / 1.75
- 辅助文本：12px
- 按钮：13px，font-weight 560

移动端字号：

- 引导标题：34px
- 引导说明：15px
- 详情标题：24px
- 详情正文：14px

---

## 10. 桌面基准画布

主要设计基准：

- 视口：1440 × 900
- 安全边距：24px
- 顶部 HUD 高度：64px
- 详情面板宽度：408px
- 左侧层级说明宽度：156px

Canvas：

- fixed inset-0
- width: 100vw
- height: 100dvh
- background: var(--ku-bg)
- dpr: min(devicePixelRatio, 1.75)
- gl antialias: true
- alpha: false
- powerPreference: high-performance
- shadows: false
- camera fov: 46
- camera near: 0.1
- camera far: 360

Canvas 不允许跟随 DOM 滚动。应用主体禁止页面纵向滚动，只有详情面板内部允许滚动。

---

## 11. 关键画面 A：首次引导

### 11.1 桌面布局

视口：1440 × 900。

背景：

- UniverseCanvas 已挂载但禁止交互。
- 相机位置：[0, 42, 86]。
- 目标点：[0, 2, 0]。
- 全图节点 opacity 0.08。
- 所有标签隐藏。
- Canvas 上覆盖 rgba(8,10,12,0.38) 与 16px blur 的环境遮罩。
- 不放粒子、视频或生成式背景图。

品牌：

- fixed left-48 top-32。
- 高度 38px。
- 主文字“知识宇宙”18px。
- 英文位于右侧，10px，letter-spacing 0.16em，opacity 0.46。

左侧说明：

- absolute left-80 top-[190px]。
- 宽度 520px。
- 标题最大宽度 480px。
- 标题两行，不超过两行。
- 说明位于标题下 24px，宽度 410px。
- 下方 32px 显示三条短说明，不使用卡片：
  - 目标决定宇宙中心
  - 路径连接课程与知识点
  - 每个节点都可以继续深入

右侧表单面板：

- absolute right-72 top-112 bottom-72。
- width 520px。
- max-height 716px。
- padding 32px。
- border 1px solid var(--ku-border)。
- background var(--ku-surface)。
- backdrop-filter blur(24px) saturate(125%)。
- border-radius 16px。
- 只允许一层内高光，不使用外发光。

表单标题：

- “建立你的学习坐标”
- 22px，font-weight 600。

字段顺序固定：

1. 专业
2. 当前身份
3. 学习目标

输入框：

- width 100%。
- height 48px，目标字段使用 96px textarea。
- label 位于输入上方 8px。
- 字段组间距 20px。
- padding-inline 14px。
- background rgba(255,255,255,0.045)。
- border 1px solid var(--ku-border)。
- focus border var(--ku-accent-border)。
- focus ring 3px var(--ku-accent-soft)。
- placeholder 不作为 label。

目标快捷选择：

- 位于目标 textarea 下 12px。
- 真实可操作过滤项，不是装饰标签。
- 文案：计算机考研408、AI工程、游戏开发、前端开发。
- 高度 32px。
- gap 8px。
- 点击后将对应文案写入目标 textarea。

主按钮：

- 位于表单底部。
- width 100%。
- height 50px。
- 文案“生成我的知识宇宙”。
- background var(--ku-accent)。
- color #0b1711。
- hover brightness 1.04。
- active scale 0.985。
- 禁止文字换行。

隐私说明：

- 主按钮下 12px。
- “画像只保存在当前浏览器中。”
- 12px，text tertiary。

### 11.2 表单行为

- 三个字段都必填。
- trim 后不得为空。
- 每个字段最长 80 个汉字。
- 学习目标最长 160 个汉字。
- 错误显示在字段下方，不使用 toast。
- 第一个错误字段自动获得焦点。
- Enter 在普通输入框中进入下一字段。
- Ctrl+Enter 或点击主按钮提交。
- 提交时按钮文案变为“正在构建知识宇宙”。
- LocalKnowledgeAI 目标解析最多等待 600ms。
- 不人为等待超过 900ms。

### 11.3 进入宇宙动画

时间线：

- 0ms：按钮进入 loading。
- 100ms：表单控件锁定。
- 180ms：左侧说明 opacity 降至 0。
- 260ms：表单面板向右移动 24px 并淡出。
- 360ms：背景 blur 开始降低。
- 420ms：CameraControls 从初始化位置进入目标区域。
- 420-1800ms：节点从 opacity 0.08 过渡到真实相关度状态。
- 800ms：HUD 开始淡入。
- 1800ms：开放相机交互。

所有 DOM 动画只改变 transform 和 opacity。

reduced-motion：

- 表单立即消失。
- 相机在 120ms 内切换。
- 不执行节点聚拢过程，只显示最终状态。

---

## 12. 关键画面 B：宇宙总览

### 12.1 HUD 布局

左上品牌：

- left 24px，top 20px。
- 高 40px。
- 不加玻璃背景。

顶部目标选择器：

- absolute top 18px left 50% transform translateX(-50%)。
- width 392px。
- height 48px。
- background rgba(18,23,26,0.68)。
- border 1px solid var(--ku-border)。
- backdrop blur 18px。
- border-radius 999px。
- 左侧 76px 显示“当前目标”。
- 中间显示目标值。
- 右侧 40px 使用 CaretDown 图标。

目标选择器点击结果：

- 展开一个 width 392px 的菜单。
- 菜单位于按钮下 8px。
- 四个固定方向纵向排列。
- 每项 44px。
- 当前项使用 accent-soft。
- 菜单外点击关闭。
- Escape 关闭。
- 切换目标后关闭详情、清空当前路径、重算相关度并移动镜头。

右上操作：

- right 24px，top 18px。
- 两个按钮横排，gap 8px。
- “返回全景”高度 48px。
- “重新设置”高度 48px。
- 返回全景使用 secondary glass。
- 重新设置使用 ghost。

左侧层级说明：

- left 28px。
- top 50%，translateY(-50%)。
- width 156px。
- 不使用完整卡片背景。
- 左侧 1px 竖线 height 232px。
- 五层标签与竖线上的刻度对齐。
- 顺序：目标、方向、课程/技能、知识点、练习。
- 当前镜头最近层级使用 text-primary，其余 text-tertiary。

左下状态：

- left 28px，bottom 24px。
- 两行。
- 第一行：100 个知识节点。
- 第二行：拖动旋转，滚轮缩放，点击进入。
- 12px，text tertiary。

右下主操作：

- right 24px，bottom 24px。
- “生成学习路径”按钮。
- height 46px。
- 仅在已有目标时可用。
- 点击后显示 LearningPathRibbon。

### 12.2 总览相机

预设：

~~~ts
overview: {
  position: [42, 34, 52],
  target: [0, 0, 0],
  fov: 46
}
~~~

CameraControls：

- makeDefault。
- smoothTime 0.72。
- draggingSmoothTime 0.12。
- minDistance 10。
- maxDistance 118。
- minPolarAngle 0.22。
- maxPolarAngle 1.42。
- dollyToCursor true。
- infinityDolly false。
- truckSpeed 1.4。
- azimuthRotateSpeed 0.65。
- polarRotateSpeed 0.55。
- 不启用 autoRotate。

---

## 13. 关键画面 C：考研408聚焦

目标匹配“计算机考研408”后：

- seed 节点是 direction-408。
- 408 分支移动到世界中心。
- 408 目标、方向、课程、知识点和练习为 active。
- 显式 prerequisite 为 contextual。
- 其他三个分支仍存在。

显示状态：

- active node opacity 0.94，scale 1.14。
- selected goal opacity 1，scale 1.28。
- contextual node opacity 0.42，scale 0.9。
- inactive node opacity 0.12，scale 0.72。
- inactive label 全部隐藏。
- active 标签按层级和镜头距离显示。

位置变化：

- 408 分支的 anchor 从 [-16, -8] 移动到 [0, 0]。
- AI anchor 从 [16, -8] 推到 [25, -12]。
- 游戏开发 anchor 从 [-16, 12] 推到 [-26, 18]。
- 前端开发 anchor 从 [16, 12] 推到 [26, 18]。
- 节点不能穿越 Y 层级。

408 聚焦相机：

~~~ts
focus408: {
  position: [19, 19, 30],
  target: [0, 3, 0],
  fov: 42
}
~~~

动画：

- 0-260ms：无关边淡出。
- 80-760ms：节点移动到 focus layout。
- 160-880ms：相关节点放大、变亮。
- 220-1200ms：相机移动。
- 480-1100ms：目标路径由上到下依次显现。
- 总时长不超过 1.4s。

---

## 14. 关键画面 D：节点聚焦与详情

验收路径：

计算机研究生 > 考研408 > 数据结构 > 线性表

点击“数据结构”：

- selectedNodeId = course-data-structures。
- 高亮 goal、direction、course 的 hierarchy 路径。
- 相关知识点保持 active。
- 镜头距离 13 world units。

点击“线性表”：

- selectedNodeId = knowledge-linear-list。
- 高亮完整 hierarchy 路径。
- 显示练习“链表操作题”。
- 镜头距离 10 world units。
- 打开右侧详情面板。

动态镜头计算：

~~~ts
const DISTANCE_BY_TYPE = {
  goal: 22,
  direction: 18,
  course: 13,
  skill: 13,
  knowledge: 10,
  practice: 8,
};

const CAMERA_OFFSET = new Vector3(0.9, 0.58, 1).normalize();
const cameraPosition = displayPosition
  .clone()
  .addScaledVector(CAMERA_OFFSET, DISTANCE_BY_TYPE[node.type]);

const baseTarget = displayPosition.clone().add(new Vector3(0, 0.45, 0));
const viewDirection = baseTarget.clone().sub(cameraPosition).normalize();
const cameraRight = viewDirection.clone().cross(new Vector3(0, 1, 0)).normalize();

// 详情打开后把节点放在屏幕 x=38%，为右侧面板留出空间。
const desiredNdcX = -0.24;
const distance = cameraPosition.distanceTo(baseTarget);
const halfWidth =
  distance *
  Math.tan(MathUtils.degToRad(camera.fov / 2)) *
  camera.aspect;
const target = baseTarget.addScaledVector(cameraRight, -desiredNdcX * halfWidth);
~~~

执行：

~~~ts
await controls.stop();
await controls.setLookAt(
  cameraPosition.x,
  cameraPosition.y,
  cameraPosition.z,
  target.x,
  target.y,
  target.z,
  true,
);
~~~

新点击必须先 stop 旧转场，禁止多个 tween 同时争夺相机。

当详情未打开时 `desiredNdcX=0`。移动端 bottom sheet 打开时目标节点锚定在屏幕 `x=50%, y=25%`，用相同投影方法增加垂直 target 偏移，保证节点位于抽屉上方，不靠经验硬写世界坐标。

### 14.1 桌面详情面板

- fixed top 84px right 24px bottom 24px。
- width 408px。
- background var(--ku-surface-strong)。
- backdrop blur 24px。
- border 1px solid var(--ku-border)。
- border-radius 16px。
- overflow hidden。
- 入场：x 24px -> 0，opacity 0 -> 1，420ms。
- 面板内部独立滚动。

顶部：

- padding 22px 22px 18px。
- 第一行显示类型文字“知识点”和关闭按钮。
- 关闭按钮 36 × 36。
- 标题“线性表”30px。
- breadcrumb 位于标题下 10px，可点击路径中的节点。

正文：

- padding 0 22px 24px。
- section 间距 24px。
- section 之间只用一条 border-top。
- 不把每个 section 包成卡片。

固定内容顺序：

1. 概念说明
2. 所属路径
3. 前置知识
4. 关联知识
5. 推荐学习内容
6. AI 解释

AI 解释按钮：

- 位于 AI 区域标题右侧。
- 高 34px。
- 文案“AI 解释”。
- 首次点击调用 KnowledgeAI.explainNode。
- loading 时显示与正文形状一致的三行 skeleton。
- 4.5s 超时后自动使用 LocalKnowledgeAI。
- 成功后显示一段不超过 180 汉字的解释。
- 不生成聊天气泡。

详情关闭：

- 点击 X、按 Escape 或点击 Canvas 空白处。
- 关闭详情只清空 selectedNodeId。
- 保留 selectedGoalId 和 408 focus layout。
- 相机返回当前目标视角，不返回总览。

---

## 15. 学习路径条

LearningPathRibbon 不是新页面。

桌面：

- fixed left 206px right 456px bottom 24px。
- min-height 116px，max-height 148px。
- background rgba(18,23,26,0.78)。
- border 1px solid var(--ku-border)。
- backdrop blur 20px。
- border-radius 16px。
- padding 16px。
- 从底部 18px 淡入，420ms。

内容：

- 顶部一行：推荐学习路径、关闭按钮。
- 下方为水平可滚动节点序列。
- 节点之间使用 CaretRight。
- 点击任一节点直接聚焦。
- 当前聚焦节点使用 accent-soft。
- 不显示伪造的学习时长、掌握度或进度百分比。

路径生成：

- LocalKnowledgeAI 必须立即生成合法路径。
- RemoteKnowledgeAI 只能重新排序和解释已有节点。
- 返回 nodeIds 必须全部存在于 Graphology 图中。
- 任意相邻步骤必须能在 hierarchy、prerequisite 或 practice_for 中找到不超过 3 跳的可解释连接；推荐顺序本身不写回知识图谱。

---

## 16. 移动端施工规格

基准视口：

- 390 × 844
- 使用 100dvh。
- 尊重 safe-area-inset-top 和 safe-area-inset-bottom。

### 16.1 移动端首次引导

- 品牌 left 16px，top calc(14px + safe-area-inset-top)。
- 主内容单列。
- 标题 left 20px，top 104px，width 340px。
- 标题 34px，最多三行。
- 说明位于标题下 16px。
- 不显示桌面三条说明。
- 表单面板 left 16px，right 16px，top 250px。
- padding 20px。
- backdrop blur 降为 16px。
- 快捷目标横向滚动，不换成两列卡片。
- 主按钮 height 50px。

### 16.2 移动端 HUD

顶栏：

- top calc(10px + safe-area-inset-top)。
- left 12px，right 12px。
- height 44px。
- 左侧只显示“知识宇宙”。
- 右侧两个 40 × 40 icon button：返回全景、重新设置。

目标选择器：

- top calc(62px + safe-area-inset-top)。
- left 16px，right 16px。
- height 44px。
- width auto。

隐藏：

- 桌面层级说明。
- 左下长操作说明。
- 桌面 LearningPathRibbon。

移动端增加一个“层级”图标按钮：

- left 16px。
- bottom calc(16px + safe-area-inset-bottom)。
- 44 × 44。
- 点击打开简短 bottom sheet，显示五层说明。

### 16.3 移动端详情

- fixed left 0 right 0 bottom 0。
- max-height 72dvh。
- border-radius 20px 20px 0 0。
- padding-bottom safe-area-inset-bottom。
- 顶部显示真实拖拽把手。
- 支持向下拖动超过 72px 或速度超过 640px/s 关闭。
- 内容仍可滚动。
- 打开详情时 Canvas 保持可见至少 28dvh。

移动端路径：

- 详情关闭时从底部显示紧凑路径条。
- left 12px，right 12px。
- bottom calc(12px + safe-area-inset-bottom)。
- height 92px。
- 横向滚动。

触控规则：

- 单指旋转。
- 双指缩放和平移。
- pointer displacement 超过 8px 后不得触发节点 click。
- 不依赖 hover。
- 所有 DOM 可点击区域至少 44 × 44。

### 16.4 断点与短屏规则

- `>= 1024px`：使用完整桌面布局。
- `768px - 1023px`：详情宽度为 `min(380px, 38vw)`；隐藏英文副标与左下第二行操作提示。
- `< 768px`：使用移动 HUD、详情 bottom sheet 和移动路径条。
- `< 480px`：以 390 × 844 基准等比流式收缩，左右安全边距不得低于 12px。
- 任意横屏且视口高度 `< 560px`：隐藏层级图例和长操作提示；详情 sheet 最大 78dvh；引导表单容器内部滚动，页面本身仍不滚动。
- `320px` 宽度是最低支持宽度；输入、按钮和目标菜单不得横向溢出。
- 移动端节点 X 坐标乘 0.68，Z 坐标乘 0.84，Y 层级保持不变；同一设备每次刷新位置仍一致。

---

## 17. 三维知识图谱数据模型

~~~ts
export type NodeType =
  | "goal"
  | "direction"
  | "skill"
  | "course"
  | "knowledge"
  | "practice";

export type RelationType =
  | "hierarchy"
  | "prerequisite"
  | "related"
  | "practice_for";

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  layer: 20 | 10 | 0 | -10 | -20;
  description: string;
  branchId: "408" | "ai" | "game" | "frontend";
  parentId?: string;
  keywords: string[];
  recommendedContent: string[];
  basePosition: [number, number, number];
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationType: RelationType;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
~~~

relations 不在 JSON 中重复存储，由 Edge 索引派生。

---

## 18. 精确 100 节点清单

每个方向固定 25 个节点：

- 1 goal
- 1 direction
- 5 course 或 skill
- 12 knowledge
- 6 practice

### 18.1 考研408

Goal：

1. goal-cs-graduate：计算机研究生

Direction：

2. direction-408：考研408

Course / Skill：

3. course-data-structures：数据结构
4. course-computer-organization：计算机组成原理
5. course-operating-systems：操作系统
6. course-computer-networks：计算机网络
7. skill-408-integration：408综合分析

Knowledge：

8. knowledge-linear-list：线性表
9. knowledge-tree：树与二叉树
10. knowledge-graph：图
11. knowledge-search：查找
12. knowledge-sort：排序
13. knowledge-data-representation：数据表示与运算
14. knowledge-memory-system：存储系统
15. knowledge-instruction-system：指令系统
16. knowledge-process-thread：进程与线程
17. knowledge-memory-management：内存管理
18. knowledge-tcp：TCP可靠传输
19. knowledge-http：HTTP与应用层

Practice：

20. practice-linked-list：链表操作题
21. practice-tree-traversal：二叉树遍历题
22. practice-graph-algorithm：图算法综合题
23. practice-cache-mapping：Cache地址映射题
24. practice-process-scheduling：进程调度题
25. practice-tcp-state：TCP状态分析题

### 18.2 AI工程

Goal：

26. goal-ai-engineer：AI工程师

Direction：

27. direction-ai-engineering：AI工程

Course / Skill：

28. course-python-engineering：Python工程基础
29. course-machine-learning：机器学习
30. course-deep-learning：深度学习
31. course-data-engineering：数据工程
32. course-llm-engineering：LLM应用工程

Knowledge：

33. knowledge-python-data-model：Python数据模型
34. knowledge-async-concurrency：异步与并发
35. knowledge-supervised-learning：监督学习
36. knowledge-model-evaluation：模型评估
37. knowledge-feature-engineering：特征工程
38. knowledge-neural-network：神经网络基础
39. knowledge-transformer：Transformer
40. knowledge-data-cleaning：数据清洗
41. knowledge-vector-database：向量数据库
42. knowledge-prompt-design：提示设计
43. knowledge-rag：检索增强生成
44. knowledge-model-serving：模型服务与评估

Practice：

45. practice-data-pipeline：数据处理管道
46. practice-classifier-evaluation：分类模型评估
47. practice-backpropagation：反向传播推导
48. practice-transformer-shape：Transformer张量推演
49. practice-rag-pipeline：RAG检索链路
50. practice-model-service：模型服务评测

### 18.3 游戏开发

Goal：

51. goal-game-engineer：游戏开发工程师

Direction：

52. direction-game-development：游戏开发

Course / Skill：

53. course-game-programming：游戏编程基础
54. course-game-math：游戏数学
55. course-game-engine：游戏引擎
56. course-game-systems：游戏系统
57. course-graphics-performance：图形与性能

Knowledge：

58. knowledge-memory-structure：程序结构与内存
59. knowledge-event-state-machine：事件与状态机
60. knowledge-vector-coordinate：向量与坐标系
61. knowledge-matrix-transform：矩阵与变换
62. knowledge-collision-detection：碰撞检测
63. knowledge-scene-entity：场景与实体
64. knowledge-input-system：输入系统
65. knowledge-animation-system：动画系统
66. knowledge-game-loop：游戏循环
67. knowledge-resource-management：资源管理
68. knowledge-rendering-pipeline：渲染管线
69. knowledge-performance-profiling：性能分析

Practice：

70. practice-player-controller：角色控制器
71. practice-coordinate-transform：坐标变换练习
72. practice-collision-response：碰撞响应练习
73. practice-character-state：角色状态机
74. practice-resource-loading：资源加载流程
75. practice-draw-call：Draw Call分析

### 18.4 前端开发

Goal：

76. goal-frontend-engineer：前端工程师

Direction：

77. direction-frontend-development：前端开发

Course / Skill：

78. course-web-foundation：Web基础
79. course-js-ts：JavaScript与TypeScript
80. course-react-engineering：React工程
81. course-browser-network：浏览器与网络
82. course-frontend-quality：前端质量

Knowledge：

83. knowledge-semantic-html：语义化HTML
84. knowledge-css-layout：CSS布局
85. knowledge-responsive-design：响应式设计
86. knowledge-event-loop：JavaScript事件循环
87. knowledge-type-system：TypeScript类型系统
88. knowledge-react-state：React状态与渲染
89. knowledge-component-design：组件设计
90. knowledge-routing-fetching：路由与数据请求
91. knowledge-browser-rendering：浏览器渲染流程
92. knowledge-http-cache：HTTP与缓存
93. knowledge-accessibility：Web可访问性
94. knowledge-web-performance：测试与Web性能

Practice：

95. practice-accessible-page：可访问页面练习
96. practice-responsive-layout：响应式布局练习
97. practice-typescript-model：TypeScript数据建模
98. practice-react-state：React状态设计
99. practice-api-cache：请求与缓存练习
100. practice-performance-audit：Web性能审计

### 18.5 节点内容字段标准

100 个节点都必须填写 `description` 和 `recommendedContent`，不得用节点名称重复填充，也不得出现“待补充”。

- goal description：说明最终能力结果，36-60 个汉字。
- direction description：说明这个方向覆盖的知识域，45-80 个汉字。
- course/skill description：说明课程职责和它在路径中的位置，40-70 个汉字。
- knowledge description：用“是什么 + 解决什么问题 + 与相邻节点关系”三部分写 60-110 个汉字。
- practice description：明确练习产出和被检验的知识，不写虚构分数或时长，36-70 个汉字。
- recommendedContent：2-3 条短语，每条 8-24 个汉字；只描述内容类型，不伪造课程链接、机构或导师。

主验收路径内容固定为：

~~~ts
const DEMO_NODE_CONTENT = {
  "goal-cs-graduate": {
    description: "建立面向计算机研究生入学与后续学习的系统知识基础，并能够把分散课程连接成可复习、可验证的完整结构。",
    recommendedContent: ["目标拆解与科目范围", "阶段性知识地图"],
  },
  "direction-408": {
    description: "围绕数据结构、计算机组成原理、操作系统和计算机网络构建统一知识网络，强调概念之间的前置关系与综合分析。",
    recommendedContent: ["四科核心概念框架", "跨科综合分析方法", "典型题型关系梳理"],
  },
  "course-data-structures": {
    description: "研究数据的组织、存储与操作方式，是理解算法效率、内存访问和复杂问题建模的基础课程。",
    recommendedContent: ["线性结构与树图结构", "查找与排序方法", "复杂度分析练习"],
  },
  "knowledge-linear-list": {
    description: "线性表是元素按一对一前后关系组织的逻辑结构，可用顺序存储或链式存储实现，是树、图和更复杂数据组织方式的基础。",
    recommendedContent: ["顺序表与链表对比", "插入删除边界条件", "链表操作题"],
  },
  "practice-linked-list": {
    description: "通过创建、插入、删除、反转和边界情况分析，验证对链式存储结构与指针连接关系的理解。",
    recommendedContent: ["单链表基础操作", "双指针链表问题", "异常输入检查"],
  },
} as const;
~~~

其他节点沿用同一语气，不使用营销话术。Zod 校验 `description.length >= 24`、`recommendedContent.length` 在 2 到 3 之间；任一节点缺失内容即视为数据构建失败。

---

## 19. 图关系施工规则

Hierarchy：

- 所有层级边统一使用 `source=父节点`、`target=子节点`。
- `goal -> direction` 使用 hierarchy。
- `direction -> course/skill` 使用 hierarchy。
- `course/skill -> knowledge` 使用 hierarchy，每个 knowledge 只有一个直接父级。
- `knowledge -> practice` 使用 practice_for，一个练习可由多个 knowledge 指向。

四个根层级固定为：

~~~ts
const ROOT_HIERARCHY = {
  "goal-cs-graduate": ["direction-408"],
  "goal-ai-engineer": ["direction-ai-engineering"],
  "goal-game-engineer": ["direction-game-development"],
  "goal-frontend-engineer": ["direction-frontend-development"],
} as const;

const DIRECTION_CHILDREN = {
  "direction-408": [
    "course-data-structures",
    "course-computer-organization",
    "course-operating-systems",
    "course-computer-networks",
    "skill-408-integration",
  ],
  "direction-ai-engineering": [
    "course-python-engineering",
    "course-machine-learning",
    "course-deep-learning",
    "course-data-engineering",
    "course-llm-engineering",
  ],
  "direction-game-development": [
    "course-game-programming",
    "course-game-math",
    "course-game-engine",
    "course-game-systems",
    "course-graphics-performance",
  ],
  "direction-frontend-development": [
    "course-web-foundation",
    "course-js-ts",
    "course-react-engineering",
    "course-browser-network",
    "course-frontend-quality",
  ],
} as const;
~~~

课程到知识点的唯一父级映射固定为：

~~~ts
const COURSE_KNOWLEDGE_CHILDREN = {
  "course-data-structures": ["knowledge-linear-list", "knowledge-tree", "knowledge-graph"],
  "course-computer-organization": ["knowledge-data-representation", "knowledge-memory-system", "knowledge-instruction-system"],
  "course-operating-systems": ["knowledge-process-thread", "knowledge-memory-management"],
  "course-computer-networks": ["knowledge-tcp", "knowledge-http"],
  "skill-408-integration": ["knowledge-search", "knowledge-sort"],

  "course-python-engineering": ["knowledge-python-data-model", "knowledge-async-concurrency"],
  "course-machine-learning": ["knowledge-supervised-learning", "knowledge-model-evaluation", "knowledge-feature-engineering"],
  "course-deep-learning": ["knowledge-neural-network", "knowledge-transformer"],
  "course-data-engineering": ["knowledge-data-cleaning", "knowledge-vector-database"],
  "course-llm-engineering": ["knowledge-prompt-design", "knowledge-rag", "knowledge-model-serving"],

  "course-game-programming": ["knowledge-memory-structure", "knowledge-event-state-machine"],
  "course-game-math": ["knowledge-vector-coordinate", "knowledge-matrix-transform"],
  "course-game-engine": ["knowledge-collision-detection", "knowledge-scene-entity", "knowledge-input-system"],
  "course-game-systems": ["knowledge-animation-system", "knowledge-game-loop", "knowledge-resource-management"],
  "course-graphics-performance": ["knowledge-rendering-pipeline", "knowledge-performance-profiling"],

  "course-web-foundation": ["knowledge-semantic-html", "knowledge-css-layout", "knowledge-responsive-design"],
  "course-js-ts": ["knowledge-event-loop", "knowledge-type-system"],
  "course-react-engineering": ["knowledge-react-state", "knowledge-component-design", "knowledge-routing-fetching"],
  "course-browser-network": ["knowledge-browser-rendering", "knowledge-http-cache"],
  "course-frontend-quality": ["knowledge-accessibility", "knowledge-web-performance"],
} as const;
~~~

知识点到练习的映射固定为：

~~~ts
const PRACTICE_SOURCES = {
  "practice-linked-list": ["knowledge-linear-list"],
  "practice-tree-traversal": ["knowledge-tree"],
  "practice-graph-algorithm": ["knowledge-graph"],
  "practice-cache-mapping": ["knowledge-memory-system"],
  "practice-process-scheduling": ["knowledge-process-thread"],
  "practice-tcp-state": ["knowledge-tcp"],

  "practice-data-pipeline": ["knowledge-data-cleaning"],
  "practice-classifier-evaluation": ["knowledge-model-evaluation"],
  "practice-backpropagation": ["knowledge-neural-network"],
  "practice-transformer-shape": ["knowledge-transformer"],
  "practice-rag-pipeline": ["knowledge-vector-database", "knowledge-rag"],
  "practice-model-service": ["knowledge-model-serving"],

  "practice-player-controller": ["knowledge-input-system", "knowledge-game-loop"],
  "practice-coordinate-transform": ["knowledge-vector-coordinate", "knowledge-matrix-transform"],
  "practice-collision-response": ["knowledge-collision-detection"],
  "practice-character-state": ["knowledge-event-state-machine"],
  "practice-resource-loading": ["knowledge-resource-management"],
  "practice-draw-call": ["knowledge-rendering-pipeline", "knowledge-performance-profiling"],

  "practice-accessible-page": ["knowledge-semantic-html", "knowledge-accessibility"],
  "practice-responsive-layout": ["knowledge-css-layout", "knowledge-responsive-design"],
  "practice-typescript-model": ["knowledge-type-system"],
  "practice-react-state": ["knowledge-react-state"],
  "practice-api-cache": ["knowledge-routing-fetching", "knowledge-http-cache"],
  "practice-performance-audit": ["knowledge-browser-rendering", "knowledge-web-performance"],
} as const;
~~~

构建边时遍历以上常量，边 ID 统一为 `${relationType}:${source}:${target}`。禁止在节点对象和边对象中各存一份不一致关系。

最小 prerequisite：

- 线性表 -> 树与二叉树
- 树与二叉树 -> 图
- 数据表示与运算 -> 存储系统
- 进程与线程 -> 内存管理
- TCP可靠传输 -> HTTP与应用层
- Python数据模型 -> 异步与并发
- 监督学习 -> 模型评估
- 神经网络基础 -> Transformer
- 数据清洗 -> 特征工程
- 向量数据库 -> 检索增强生成
- 提示设计 -> 检索增强生成
- 程序结构与内存 -> 游戏循环
- 向量与坐标系 -> 矩阵与变换
- 矩阵与变换 -> 碰撞检测
- 事件与状态机 -> 动画系统
- 场景与实体 -> 资源管理
- 语义化HTML -> Web可访问性
- CSS布局 -> 响应式设计
- JavaScript事件循环 -> React状态与渲染
- TypeScript类型系统 -> 组件设计
- HTTP与缓存 -> 路由与数据请求
- 浏览器渲染流程 -> 测试与Web性能

跨分支 related：

- HTTP与应用层 <-> HTTP与缓存
- 异步与并发 <-> JavaScript事件循环
- 模型服务与评估 <-> 测试与Web性能
- 性能分析 <-> 测试与Web性能

筛选算法不得自行推断新 prerequisite。

### 19.1 目标匹配算法

本地匹配必须确定、可测试，不能调用模糊向量服务，也不能让“计算机”这个宽泛词同时激活四个方向。

别名固定为：

~~~ts
const GOAL_ALIASES = {
  "direction-408": ["计算机考研408", "计算机408", "考研408", "408", "计算机研究生"],
  "direction-ai-engineering": ["AI", "AI工程", "AI工程师", "人工智能工程", "机器学习工程师", "LLM应用工程"],
  "direction-game-development": ["游戏", "游戏开发", "游戏开发工程师", "游戏工程师", "游戏引擎开发"],
  "direction-frontend-development": ["前端", "前端开发", "前端工程师", "Web前端", "React前端"],
} as const;
~~~

输入和别名使用同一规范化：`NFKC -> lowercase -> trim -> 删除全部空白和常见标点`。先做最长别名精确包含匹配，再做关键词评分：

- 规范化输入等于别名：100 分。
- 输入完整包含长度至少 3 的别名：90 分，加 `min(8, 别名长度 / 2)`。
- 未命中别名时使用固定关键词权重：408=70、考研=30、人工智能/AI/机器学习/LLM/大模型=70、游戏=55、引擎=25、前端=70、Web/React=35、开发/工程/工程师=10；同一词只计一次，每个方向最多 100 分。
- 只有“计算机”“学习”“工程师”“本科生”等宽泛词：0 分。
- 取最高分；并列时取最长命中的别名，不按节点顺序猜测。
- 分数小于 70：返回 `unmatched`，保持总览，展示四个快捷目标。

输入“计算机考研408”必须得到：

~~~ts
{
  status: "matched",
  nodeId: "direction-408",
  confidence: 1,
  matchedAlias: "计算机考研408"
}
~~~

专业和当前身份不参与方向 seed 竞争，避免“软件工程本科生”覆盖用户明确的考研目标。它们只影响解释措辞和路径说明。

### 19.2 相关度算法

选择 direction 后按最大值合并相关度，不把多条边分数相加：

- seed direction：1.00。
- 对应 goal 祖先：0.92。
- 直属 course/skill：0.90。
- 分支内 knowledge：0.82。
- 分支内 practice：0.74。
- 从 active 节点经 prerequisite 到达的节点：第一跳 0.48，以后每跳乘 0.72，最多两跳。
- 从 active 节点经 related 到达的跨分支节点：0.30，只走一跳。
- 其余节点：0.08。

视觉状态阈值：

~~~ts
function toVisualState(relevance: number, selected: boolean) {
  if (selected) return "selected";
  if (relevance >= 0.7) return "active";
  if (relevance >= 0.25) return "contextual";
  return "inactive";
}
~~~

所有相关节点集合、边集合、路径和状态都由纯函数计算。相同图数据、目标和选中节点必须产生完全相同输出。

---

## 20. 确定性空间布局

四个 branch anchor：

~~~ts
const BRANCH_ANCHORS = {
  "408": [-16, -8],
  ai: [16, -8],
  game: [-16, 12],
  frontend: [16, 12],
} as const;
~~~

Y 坐标：

~~~ts
const LAYER_Y = {
  goal: 20,
  direction: 10,
  skill: 0,
  course: 0,
  knowledge: -10,
  practice: -20,
} as const;
~~~

同层排布：

1. 按 branchId 分组。
2. 每组内按 type 和 id 稳定排序。
3. goal 和 direction 位于 branch anchor。
4. course/skill 在 anchor 周围半径 6-10 的弧线上。
5. knowledge 在半径 10-16 的弧线上。
6. practice 在半径 16-20 的弧线上。
7. 同一输入必须得到完全相同的位置。
8. 禁止 Math.random。
9. 禁止运行时持续 force simulation。

允许微调：

- branch anchor 最多调整 3 world units。
- 同层半径最多调整 15%。
- Y 层级不得改变。

---

## 21. 节点、标签和边

### 21.1 节点几何

全部节点使用共享 sphereGeometry，禁止每个节点创建 geometry。

半径：

- goal 1.32
- direction 1.0
- course / skill 0.68
- knowledge 0.46
- practice 0.32

材质基础：

- MeshStandardMaterial
- roughness 0.38
- metalness 0.08
- transparent true
- active、selected 材质 depthWrite true
- contextual、inactive 材质 depthWrite false，renderOrder 低于 active
- active emissiveIntensity 0.32
- selected emissiveIntensity 0.5

材质按“节点类型 × 视觉状态”预创建有限实例并复用。状态改变时切换共享材质引用，不在 `useFrame` 中 new Material 或修改所有节点共用的 opacity。

目标和方向增加一圈 SelectionRing，但只有 selected 或 active goal 显示。

### 21.2 节点状态

~~~ts
const NODE_VISUAL_STATE = {
  inactive: { opacity: 0.12, scale: 0.72 },
  contextual: { opacity: 0.42, scale: 0.9 },
  active: { opacity: 0.94, scale: 1.14 },
  selected: { opacity: 1, scale: 1.32 },
};
~~~

状态过渡：

- useFrame 内使用 damp。
- scale smoothTime 0.24。
- opacity smoothTime 0.3。
- position smoothTime 0.56。
- 不通过 React setState 逐帧更新。

### 21.3 标签

- 使用 Drei Text + Billboard。
- 字体为本地 Noto Sans SC 子集。
- goal fontSize 0.9。
- direction 0.68。
- course/skill 0.48。
- knowledge 0.38。
- practice 0.31。
- 标签位于节点上方 radius + 0.38。
- 默认 center 对齐。
- outlineWidth 0.018。
- outlineColor var(--ku-bg) 对应的 Three Color。

标签可见条件：

- goal 与 direction 常驻。
- active course/skill 常驻。
- knowledge 仅在 active 且距离相机小于 34 时显示。
- practice 仅在距离相机小于 22、hover 或 selected 时显示。
- inactive 不显示标签。

### 21.4 边

普通 hierarchy：

- 单份 BufferGeometry + LineSegments。
- color rgba(190, 201, 196, 0.14)。
- opacity 由相关度更新。

激活 hierarchy：

- color #86c9a8。
- opacity 0.68。
- 视觉宽度约 1.6px。

selected path：

- color #b6ebd1。
- opacity 0.96。
- 视觉宽度约 2.2px。
- 使用少量 Drei Line 单独绘制。
- dashOffset 从 0 到 -0.8，1.8s 线性循环。
- 只有 selected path 流动。

related：

- 只在选中节点时显示。
- dashSize 0.34。
- gapSize 0.22。
- opacity 0.32。

禁止：

- 全图流动粒子。
- 每条边一个独立材质。
- 发光 Bloom。
- 箭头铺满所有边。

---

## 22. 交互状态机

~~~ts
export type AppPhase =
  | "onboarding"
  | "enteringUniverse"
  | "overview"
  | "goalFocused"
  | "nodeFocused";

export interface KnowledgeState {
  phase: AppPhase;
  profile: UserProfile | null;
  selectedGoalId: string | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeNodeIds: ReadonlySet<string>;
  activeEdgeIds: ReadonlySet<string>;
  selectedPathNodeIds: readonly string[];
  selectedPathEdgeIds: readonly string[];
  pathRibbonNodeIds: readonly string[];
  isPathRibbonOpen: boolean;
  cameraIntent: CameraIntent;
  aiStatus: "idle" | "loading" | "success" | "fallback" | "error";
}
~~~

Store 中不得保存：

- THREE.Object3D
- CameraControls 实例
- Geometry
- Material
- Graphology 实例
- 每帧 position

Graphology 图实例由 graph/repository.ts 创建并保持只读。

### 22.1 状态动作与持久化

Store 只暴露以下业务动作：

~~~ts
interface KnowledgeActions {
  submitProfile(profile: UserProfile): Promise<void>;
  selectGoal(goalId: string): void;
  selectNode(nodeId: string): void;
  hoverNode(nodeId: string | null): void;
  closeNodeDetail(): void;
  returnOverview(): void;
  openOnboarding(): void;
  requestExplanation(nodeId: string): Promise<void>;
  generateLearningPath(): Promise<void>;
  closeLearningPath(): void;
}
~~~

持久化 key 固定为 `knowledge-universe:profile:v1`，内容只包含：

~~~ts
interface PersistedStateV1 {
  version: 1;
  profile: UserProfile;
  selectedGoalId: string | null;
}
~~~

- 不持久化 phase、hover、详情、相机姿态、AI loading、运行时集合。
- 启动时先 Zod 校验；非法 JSON、未知版本或不存在的 goalId 一律丢弃并回到 onboarding。
- “重新设置”打开预填画像，不立刻删除旧值；只有新表单成功提交才原子替换。
- localStorage 写入失败时保留内存状态并显示非阻塞提示，不中断探索。
- 测试通过 storage adapter 注入内存实现，不直接 mock 全局对象。

### 22.2 指针行为

Hover：

- 进入节点 140ms 内提高 scale 4%。
- 显示标签。
- 将 Canvas cursor 设为 pointer。
- 离开恢复。

Click：

- pointer displacement 桌面小于 5px。
- pointer down 到 up 小于 350ms。
- 满足条件才选择节点。
- 否则视为相机拖动。

Canvas 空白点击：

- 若详情打开，关闭详情。
- 若详情关闭，不改变目标。

键盘：

- Escape：先关闭详情，再关闭目标菜单。
- Enter：激活当前无障碍列表节点。
- Tab：只在 DOM 控件和 AccessibleGraphNavigator 中移动。
- 不劫持浏览器常用快捷键。

---

## 23. AI 接口

~~~ts
export interface KnowledgeAI {
  parseGoal(
    profile: UserProfile,
    input: string,
    signal?: AbortSignal,
  ): Promise<GoalMatchResult>;

  explainNode(
    nodeId: string,
    profile: UserProfile,
    signal?: AbortSignal,
  ): Promise<NodeExplanationResult>;

  generateLearningPath(
    goalId: string,
    profile: UserProfile,
    signal?: AbortSignal,
  ): Promise<LearningPathResult>;
}
~~~

LocalKnowledgeAI：

- 始终可用。
- 使用 aliases.ts 匹配目标。
- 使用 explanations.ts 返回概念解释。
- 使用 hierarchy 与 prerequisite 生成路径。
- 输出完全确定。

本地解释生成规则：

1. 先读取节点的 `description`。
2. 附加直接父节点：“它位于 {父节点} 路径中”。
3. 有 prerequisite 时附加最多两个前置节点。
4. 有 practice 时附加一个可验证练习。
5. 总长度 90-180 个汉字，纯文本，不返回 Markdown、HTML 或来源链接。

本地学习路径规则：

1. 从选中 direction 读取固定课程顺序。
2. 每门课程的 knowledge 按 prerequisite 拓扑排序，同级按数据数组顺序。
3. 在知识点后插入直接 practice；同一 practice 只出现一次。
4. 最多返回 18 个节点，至少覆盖 4 个不同课程或技能。
5. 如果 prerequisite 形成环，数据校验阶段直接失败，不在运行时猜测顺序。

408 默认路径固定作为回归快照：

~~~ts
[
  "direction-408",
  "course-data-structures",
  "knowledge-linear-list",
  "practice-linked-list",
  "knowledge-tree",
  "practice-tree-traversal",
  "knowledge-graph",
  "practice-graph-algorithm",
  "course-computer-organization",
  "knowledge-data-representation",
  "knowledge-memory-system",
  "practice-cache-mapping",
  "course-operating-systems",
  "knowledge-process-thread",
  "practice-process-scheduling",
  "course-computer-networks",
  "knowledge-tcp",
  "practice-tcp-state"
]
~~~

RemoteKnowledgeAI：

- 只调用同源服务器代理。
- 建议端点：
  - POST /api/ai/parse-goal
  - POST /api/ai/explain-node
  - POST /api/ai/learning-path
- 浏览器不读取 API Key。
- timeout 4500ms。
- 使用 AbortController。
- 所有响应通过 Zod。
- 所有 nodeId 必须在当前图中。
- 失败后自动回退 local。
- 回退不弹阻塞错误，只显示“已使用本地知识库生成”。

远端 AI 禁止：

- 生成不存在的节点。
- 修改节点坐标。
- 返回 HTML。
- 自动新增 prerequisite。
- 输出聊天对话。

---

## 24. 加载、错误、降级和无障碍

Scene loading：

- 显示真实五层骨架，不显示圆形 spinner。
- 进度文案只有“正在建立空间坐标”。
- 字体与图数据加载完成后再显示标签。

数据校验失败：

- 阻止不完整图谱进入场景。
- 标题：“知识数据加载失败”。
- 正文：“知识关系未能通过校验，请重新载入。”
- 唯一主操作：“重新载入”。
- duplicate ID、悬空边、错误 layer、hierarchy 环、知识点缺少唯一父级都必须在开发控制台给出明确 ID。

WebGL 初始化失败：

- 显示 WebGLFallback。
- 使用同一 Graphology 数据。
- 展示五层可折叠文本导航。
- 支持目标筛选和节点详情。
- 不显示空白黑屏。
- 标题：“当前设备无法加载三维空间”。
- 正文：“你仍可以通过简化导航查看知识路径。”
- 主按钮：“打开简化导航”。
- 次按钮：“重试三维空间”。

WebGL context lost：

- 监听 Canvas `webglcontextlost`，调用 `event.preventDefault()`，冻结场景但保留 store。
- 遮罩标题：“三维空间已暂停”。
- 正文：“图形环境暂时中断，你的目标与当前位置已经保留。”
- 按钮：“恢复空间”。
- 用户点击后只重建 Canvas 渲染资源，不重置画像、目标或选中节点。
- 连续两次恢复失败后进入简化导航，禁止无限重试。

字体失败：

- DOM 使用系统中文字体。
- 3D 标签退化为只显示选中节点的 Html 标签。

Remote AI 失败：

- 自动 local fallback。
- 不阻止选择节点和相机移动。
- 显示 4s 非阻塞提示：“AI 服务暂不可用，已切换为本地解析”。

目标无法匹配：

- 维持 overview 相机和四个方向默认视觉。
- 目标选择器不显示激活态。
- 表单下显示：“暂未找到精确目标。可尝试：考研408、AI工程、游戏开发或前端开发。”
- 不得以“计算机”宽泛匹配所有分支，也不得随机挑选最近字符串。

详情空数据：

- 前置知识为空：“当前图谱中暂无明确前置知识”。
- 关联知识为空：“暂无关联知识”。
- 推荐内容为空：“暂无推荐内容”。
- 标题保留，不因为数组为空而隐藏整节。

无障碍：

- Canvas aria-hidden。
- AccessibleGraphNavigator 提供等价 DOM 节点列表。
- LiveRegion 播报“已进入数据结构”“已选择线性表”等状态。
- 选中状态同时使用尺寸、外圈和连接线，不只依赖颜色。
- 所有文本达到 WCAG AA。
- reduced-motion 关闭流动虚线并缩短镜头移动。
- prefers-reduced-transparency 下改用 var(--ku-surface-strong)，取消 backdrop-filter。

---

## 25. 性能预算

目标：

- 1440 × 900 稳定设备：交互期间接近 60 FPS。
- 390 × 844 中端移动设备：不低于 30 FPS。
- 首屏 3D 可交互时间不超过 2.5s，本地开发冷启动除外。
- 节点选择后的视觉响应不超过 100ms。

强制措施：

- geometry/material 共享。
- 普通边批量。
- 每帧不得创建 Vector3、Color、数组或 Set。
- 每帧不得写 React state。
- Zustand 使用最小 selector。
- 详情 DOM 与 Three 帧循环隔离。
- DPR 桌面最大 1.75，移动最大 1.35。
- 移动端减少 knowledge 和 practice 标签。
- 不开阴影、SSA0、DOF、Bloom。
- 只有路径动画期间保持持续 invalidate。

若性能不达标，优化顺序：

1. 降低 DPR。
2. 减少可见标签。
3. 合并普通边。
4. 按节点类型切换到 InstancedMesh。
5. 降低 sphere 分段。
6. 禁止删除交互、路径或详情作为第一优化手段。

---

## 26. 精确实施顺序

### 工程基线

- 初始化 Vite。
- 接入 Tailwind 4 Vite plugin。
- 建立 tokens.css 和字体。
- 配置 @/ alias。
- 配置 Vitest、Testing Library、Playwright。
- 初始化 Git 并提交 baseline。

验收：

- npm run dev 可打开空壳。
- npm run build 成功。
- npm run test 成功。

### 数据和图

- 写完 100 节点。
- 写完 hierarchy、practice、prerequisite、related。
- Zod 校验。
- Graphology 构建。
- 完成索引与遍历。

验收：

- 节点数恰好 100。
- 每个分支恰好 25。
- 无重复 ID。
- 无悬空边。
- hierarchy 无环。
- 每个 knowledge 有唯一直接父级。

### 三维白模

- Canvas。
- CameraControls。
- 五层坐标。
- 节点。
- 普通边。
- 标签。
- 点击和拖动分离。

验收：

- 不接 UI 也可在场景中选择节点。
- 100 节点可见。
- Y 层级正确。

### 目标驱动重组

- goalMatcher。
- relevance。
- focus layout。
- 408 镜头。
- inactive 降级。
- 路径高亮。

验收：

- “计算机考研408”只以 408 为 seed。
- 三个无关方向不删除。
- 刷新位置不变化。

### 产品 UI

- Onboarding。
- HUD。
- GoalSelector。
- LayerLegend。
- NodeDetailPanel。
- LearningPathRibbon。
- mobile sheet。

验收：

- 桌面和手机可完成同一闭环。
- 所有按钮位置与本文一致。

### AI

- LocalKnowledgeAI。
- Remote adapter。
- timeout 和 fallback。
- Zod 输出检查。

验收：

- 断网可解释节点并生成路径。
- 远端返回非法 ID 时自动拒绝并回退。

### 视觉收敛

- 材质、字体、线宽和层级刻度。
- 动画时序。
- reduced-motion。
- reduced-transparency。
- 复制检查。

验收：

- 没有泛紫色 AI 视觉。
- 没有无意义粒子。
- 没有全图发光。
- 没有一屏玻璃卡片堆叠。

### 最终 QA

- 单测。
- E2E。
- 桌面截图。
- 移动截图。
- 控制台检查。
- Lighthouse。
- 生产构建。

---

## 27. Playwright 验收脚本

桌面 1440 × 900：

1. 清空 localStorage。
2. 打开首页。
3. 截图 onboarding-desktop.png。
4. 输入“软件工程”“本科生”“计算机考研408”。
5. 点击“生成我的知识宇宙”。
6. 等待 phase 为 goalFocused。
7. 截图 408-focused-desktop.png。
8. 点击“数据结构”。
9. 等待相机停止。
10. 点击“线性表”。
11. 验证详情包含“线性表”“所属路径”“前置知识”“关联知识”“推荐学习内容”。
12. 截图 linear-list-detail-desktop.png。
13. 点击“AI 解释”。
14. 模拟断网。
15. 验证出现“已使用本地知识库生成”。
16. 点击“生成学习路径”。
17. 验证路径全部是合法节点。
18. 截图 learning-path-desktop.png。
19. 关闭详情。
20. 验证仍处于 408 聚焦。
21. 点击“返回全景”。
22. 验证四个方向仍存在。

移动端 390 × 844：

1. 完成相同画像。
2. 验证目标选择器宽度不溢出。
3. 点击知识节点。
4. 验证 bottom sheet 最大高度不超过 72dvh。
5. 验证 Canvas 仍有至少 28dvh 可见。
6. 向下拖动关闭详情。
7. 验证所有触控目标至少 44 × 44。

---

## 28. 必须生成的验收截图

- onboarding-desktop-1440x900.png
- universe-overview-desktop-1440x900.png
- focus-408-desktop-1440x900.png
- data-structures-focus-desktop-1440x900.png
- linear-list-detail-desktop-1440x900.png
- learning-path-desktop-1440x900.png
- onboarding-mobile-390x844.png
- focus-408-mobile-390x844.png
- detail-mobile-390x844.png
- webgl-fallback-desktop.png

截图中不得出现：

- 开发日志。
- FPS 面板。
- 调试坐标。
- 缺失字体。
- 未加载标签。
- 浏览器默认 focus outline 被裁切。

---

## 29. 禁止事项

- 禁止把项目做成普通 Dashboard。
- 禁止使用传统树目录替代三维空间。
- 禁止实时随机力导向。
- 禁止删除无关节点。
- 禁止使用聊天窗口。
- 禁止浏览器保存 AI Key。
- 禁止将所有代码放进 App.tsx。
- 禁止每条边一个 React 组件。
- 禁止每个节点独立创建 geometry 和 material。
- 禁止通过 setState 做逐帧动画。
- 禁止无清理的 requestAnimationFrame 和事件监听器。
- 禁止页面级纵向滚动。
- 禁止自定义鼠标图形。
- 禁止纯黑 #000000 与纯白 #ffffff 作为大面积背景。
- 禁止紫色 AI 渐变。
- 禁止 Bloom、DOF、粒子爆炸和随机漂浮。
- 禁止把详情写成多个相同卡片。
- 禁止伪造学习时长、掌握率、成绩或进度。
- 禁止提前实现登录、云同步、答题和图谱编辑。

---

## 30. 最终终止条件

同时满足以下条件，Demo 才算完成：

1. 首次访问出现完整引导。
2. 用户画像保存并可重新设置。
3. 100 节点校验通过。
4. 五个 Y 层级正确。
5. 目标输入能稳定命中 408。
6. 相关节点增强，无关节点保留并弱化。
7. 镜头能够总览、目标聚焦、课程聚焦和知识点聚焦。
8. 能从考研408进入数据结构，再进入线性表。
9. 详情包含所有规定信息。
10. AI 解释和学习路径断网可用。
11. 关闭详情后不丢失目标上下文。
12. 返回全景后四个方向完整存在。
13. 桌面和移动端完成同一闭环。
14. WebGL 失败时有可读降级。
15. reduced-motion 和 reduced-transparency 生效。
16. npm run build 成功。
17. npm run test 成功。
18. Playwright 核心流程成功。
19. 控制台无未处理异常和资源 404。
20. 验收截图全部生成并人工检查。

达到这些条件后停止新增功能，只允许：

- 调整不超过 15% 的间距、字号、透明度和世界坐标。
- 修正文案和知识数据。
- 修复性能、兼容性和无障碍问题。

不得以“还可以加入更多功能”为理由推迟交付。
