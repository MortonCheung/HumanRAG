# Knowledge Universe V4 施工蓝图

> 文档状态：可直接进入施工
>
> 版本：V4.0
>
> 视觉代号：黑曜神经海 Obsidian Neural Ocean
>
> 适用仓库：`/Users/morton_cheung/Desktop/AI/iTeach`
>
> 参考库：`/Users/morton_cheung/Desktop/AI/iTeach/iTeach-design-references`
>
> 本文档是下一轮实现的唯一施工基线。若旧文档与本文冲突，以本文为准。

## 0. 施工结论

V4 不是对现有页面换色，而是保留工程骨架后，重建知识本体、图遍历和 WebGL 渲染管线。

最终产品打开后直接进入一个全屏、深黑、可探索的计算机知识神经空间。画面主体是数百个彼此分离的发光神经元和有方向的弯曲突触，不再出现首次访问的确认方向页面，也不再把知识节点画成暗淡胶囊。

点击任意中层节点时，系统必须同时完成四件事：

1. 递归寻找它的上游前置知识和所属知识层级。
2. 递归寻找它能解锁的下游知识、技能和练习。
3. 以一次有方向的神经放电动画点亮整条因果走廊。
4. 镜头沿弧线靠近，右侧连续阅读面板解释该节点及其完整上下文。

目标筛选不再是一个知识根节点，而是作用于同一知识宇宙的“透镜”。例如选择“考研 408”后，知识没有被删除，只是相关区域靠近、增亮、提高标签预算；无关节点仍作为世界背景存在。

## 1. 不可更改的产品边界

### 1.1 必须实现

- 首屏直接进入知识空间，不显示阻塞式 Onboarding。
- 默认展示计算机科学全景，范围提示为“Knowledge Universe / Computer Science”。
- 节点是圆形发光神经元，不按类型改成胶囊、卡片、八面体或圆环。
- 每个知识领域有稳定颜色，选择状态由亮度、尺度、脉冲和文字共同表达，不能只靠颜色。
- 光晕不能在屏幕上大面积重叠，节点密集处自动缩小光晕和归一化亮度。
- 点击任意节点后，上游、当前节点、下游同时被计算和点亮。
- 连接线为三维曲线，动画表现为突触内的能量窗口，不使用沿线移动的小球。
- 镜头移动采用有语义的弧线，用户拖拽时可立即接管。
- 桌面、平板、手机和超宽屏保持同一视觉语言。
- 比赛现场断网时，图探索和本地 AI 解释仍可完整运行。

### 1.2 明确禁止

- 不做传统 Dashboard、侧边目录树或课程卡片墙。
- 不使用紫蓝 AI 渐变作为主视觉。
- 不把所有面板都做成玻璃拟态。
- 不堆叠无意义粒子、流星、黑洞、鱼群或水波。
- 不把“海洋感”做成字面海底视频。海洋感只来自深黑负空间、局部体积光、层次和缓慢环境流动。
- 不让 GSAP、Motion 和 R3F 同时控制同一属性。
- 不从 `iTeach-design-references` 直接跨目录 import 运行时代码。
- 不在 V4 同时安装 Anime.js 与 Lottie。
- 不复制 Marble 的小学知识数据、媒体或文案。

## 2. 评委看到的 90 秒主流程

### 2.1 进入

页面加载后，黑色空间在 900ms 内从完全静止进入可交互状态。中央偏左可见计算机科学知识网络，右上只有四个安静的图标操作：搜索、目标透镜、知识地图、空间设置。

界面不弹表单。左下显示：

```text
COMPUTER SCIENCE
336 knowledge nodes · 9 domains
```

### 2.2 选择目标透镜

点击右上“目标透镜”，右侧打开 380px 抽屉。选择“计算机考研 408”后：

- 408 相关节点在 0.9s 内提高亮度和标签密度。
- 数据结构、组成原理、操作系统、计算机网络四个区域向视觉中心轻微收拢。
- 其他领域后移 8% 至 14%，核心仍可见，标签隐藏。
- 镜头进入 408 的宏观包围盒。
- 左下状态更新为“Lens: Postgraduate 408”。

### 2.3 点击中层节点

点击“数据结构”或搜索“链表”：

- 入射阶段先从前置知识向被选节点传导。
- 被选神经元白热闪亮一次。
- 出射阶段再从当前节点向后续知识与练习传导。
- 主因果路径为熔金色，次级相关边保留领域色但降低强度。
- 镜头沿曲线靠近，不穿越节点团。
- 右侧打开节点详情面板，底部显示因果走廊控制台。

### 2.4 查看解释与学习路径

详情面板连续展示：名称、类型、所属路径、概念说明、上游前置、下游解锁、横向关联、推荐内容。点击“生成学习路径”时，本地 Provider 也能返回合法路径，不依赖远程 API。

### 2.5 返回全景

按 `Esc` 依次关闭命令面板、抽屉、详情，再按一次返回当前透镜全景。按 `R` 直接返回计算机科学总览。

## 3. 现有工程审计与改造判断

### 3.1 可保留

- `src/main.tsx` 的 React 启动边界。
- `src/App.tsx` 作为轻量装配层的职责。
- Zustand 作为唯一业务状态源。
- Motion 作为 DOM 面板动画系统。
- `src/graph/curves.ts` 中稳定哈希和确定性曲线的思想。
- OrbitControls 的用户接管机制。
- `ScreenAnchorTracker` 将三维节点投影到 DOM 的思路。
- NodeInspector 已有的信息栏目。
- PathNavigator 位于底部中央的空间位置。
- 当前 100 节点作为 V4 数据迁移种子。
- `prefers-reduced-motion` 降级规则。

### 3.2 必须替换

- 删除首次访问的 `OnboardingScreen` 渲染路径。
- 用 `activeLensId` 替换知识本体中的 `selectedGoalId`。
- 替换单一 `parentId` 树模型，改为多关系有向图。
- 替换只递归 hierarchy 后代的 relevance 算法。
- 替换 `KnowledgeNodeMesh` 的胶囊、八面体和圆环。
- 替换每条边一个材质、一个 useFrame 的 `KnowledgeCurves`。
- 替换直线 lerp 的 CameraController。
- 替换单文件 `styles.css`。
- 替换硬编码学习路径和全局单一 `aiStatus`。

### 3.3 工作区保护

当前工作区已有用户改动：

- `vite.config.ts` 已修改。
- `.v2c/` 未跟踪。
- `PROJECT_REPORT.md` 未跟踪。

施工不得重置、覆盖或删除这些内容。参考目录继续保持在 Vite 构建边界之外。

## 4. 视觉系统：黑曜神经海

### 4.1 视觉原则

视觉主体永远是知识图本身，UI 只在用户需要时出现。Apple 的产品主体优先、Claude 的连续阅读、Linear 的技术精度和 Runway 的全屏视觉共同构成界面原则。

画面层次从后到前为：

1. 漆黑背景和极弱低频环境 Shader。
2. 远处休眠节点与低对比突触。
3. 当前领域节点与结构线。
4. 被选择的因果走廊。
5. 选中神经元白热核心。
6. 克制的 DOM 信息层。

### 4.2 颜色令牌

新建 `src/styles/tokens.css`，组件和 Shader 不直接散落硬编码颜色。

```css
:root {
  --ku-bg-abyss: #020303;
  --ku-bg-lacquer: #070808;
  --ku-surface-deep: #0b0c0d;
  --ku-surface-raised: #111214;
  --ku-rule: rgb(255 255 255 / 0.11);
  --ku-rule-strong: rgb(255 255 255 / 0.19);
  --ku-text-primary: #f0efe9;
  --ku-text-secondary: #a3a29c;
  --ku-text-tertiary: #686965;
  --ku-chain-gold: #e6bf67;
  --ku-hot-core: #fff8dc;
  --ku-focus-white: #fffdf4;
  --ku-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ku-ease-material: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

领域色由 `src/design/domainPalette.ts` 输出：

| 领域 | 色值 | 用途 |
| --- | --- | --- |
| 数学与理论 | `#72D5F4` | 离散数学、概率、计算理论 |
| 系统与体系结构 | `#6688E8` | 操作系统、组成原理、编译 |
| 软件与 Web | `#63C9A6` | 软件工程、前端、后端 |
| AI 与数据 | `#E8B85B` | 机器学习、数据科学、数据库 |
| 图形与游戏 | `#F08063` | 图形学、引擎、游戏开发 |
| 网络与安全 | `#D56F8D` | 网络、密码学、安全 |
| 跨领域基础 | `#D8D9D3` | 通用工具、工程基础 |

规则：领域色只表达节点归属；选中状态统一向白热核心过渡；主因果走廊统一使用熔金色。

### 4.3 排版

- 字体：`Geist, PingFang SC, Microsoft YaHei, sans-serif`。
- 品牌名：14px，500，字距 `-0.02em`。
- 操作文字：13px 至 14px。
- 正文：16px，行高 1.55。
- 数字状态：11px 至 12px，使用大写英文和微弱字距。
- 节点标签：桌面 12px 至 14px，手机只显示选中、搜索和高优先级节点。
- 不使用专有 Apple、Claude 或 Linear 字体。

### 4.4 材质和面板

- 默认面板是近黑实色表面，不是透明玻璃。
- 只有面板靠近 WebGL 的边缘使用渐进模糊过渡。
- 圆角限定为 6px、8px、10px 三档。
- 边框为 1px hairline，不使用大阴影。
- 只有当前活动面板可以出现一次金色边缘追踪，持续 520ms 后停止。
- 不能同时出现两个大型抽屉。

## 5. 全屏布局和精确位置

根容器使用 `position: fixed; inset: 0; min-height: 100dvh; overflow: hidden; background: var(--ku-bg-abyss)`。

### 5.1 桌面，宽度大于等于 1280px

- Canvas：`position: absolute; inset: 0`。
- 左上品牌：左 28px，顶部 24px，高 40px。
- 右上操作组：右 28px，顶部 22px，按钮 40x40px，间距 8px。
- 左下 WorldStatus：左 28px，底部 26px，最大宽 260px。
- 底部 CausalCorridorDock：水平居中，底部 22px，高 64px，宽度按内容 360px 至 620px。
- NodeInspector：右 24px，顶部 82px，底部 96px，宽 410px。
- GoalLensDrawer：右 24px，顶部 82px，宽 380px，最大高 `calc(100dvh - 112px)`。
- KnowledgeAtlasDrawer：左 24px，顶部 82px，宽 320px，最大高 `calc(100dvh - 112px)`。
- CommandPalette：宽 700px，顶部为 12dvh，水平居中，最大高 68dvh。
- Toast：左下 WorldStatus 上方 16px，不覆盖 Dock。

### 5.2 平板，768px 至 1279px

- 外边距统一为 18px。
- Inspector 宽度为 `min(380px, 44vw)`。
- Dock 高 60px，隐藏文字较长的次级操作。
- Atlas 宽 300px。
- 图的视觉中心向左移动 Inspector 宽度的 18%，避免选中节点被面板完全遮挡。

### 5.3 手机，小于 768px

- 顶部品牌左 16px，上 14px。
- 右上只显示搜索与更多，目标、地图、设置放入更多菜单。
- 所有大型面板进入统一 `MobileSheet`，左右 12px，底部 12px，最大高 72dvh。
- Sheet 顶部包含 32x4px 拖拽指示条，正文不小于 16px。
- Dock 左右 12px，底部 12px，高 56px；Sheet 打开时 Dock 隐藏。
- 触控目标最小 44x44px。
- 标签预算降为桌面的 35%。
- DPR 限制为 1 至 1.5。

### 5.4 超宽屏，宽高比大于 2.1

- 相机垂直 FOV 不变，使用水平可见范围展示更多邻域，不能把图拉伸。
- Inspector 固定 420px，不随屏幕无限变宽。
- 宇宙主体最大横向跨度为可视宽度的 72%。
- 左右 UI 与屏幕边缘保持 32px，Dock 保持居中。

## 6. 目标组件树

```text
App
└── UniverseShell
    ├── KnowledgeFieldCanvas
    │   ├── KnowledgeEnvironment
    │   │   ├── DeepField
    │   │   └── SemanticLayerMarkers
    │   ├── NeuralGraphLayer
    │   │   ├── NeuralSynapseField
    │   │   ├── NeuralNodeField
    │   │   ├── NodeHaloLayer
    │   │   ├── NodeHitTargets
    │   │   └── SpatialLabels
    │   ├── CameraRig
    │   ├── ScreenProjectionSystem
    │   └── NeuralPostProcessing
    └── ExplorerInterface
        ├── TopBar
        ├── WorldStatus
        ├── CommandPalette
        ├── GoalLensDrawer
        ├── KnowledgeAtlasDrawer
        ├── NodeInspector
        │   ├── InspectorHeader
        │   ├── KnowledgeSummary
        │   ├── CausalRelations
        │   ├── RecommendedMaterial
        │   ├── AIExplanation
        │   └── SpatialConnector
        ├── CausalCorridorDock
        ├── MobileSheet
        └── ToastViewport
```

原则：`App` 只装配；图算法不写进组件；R3F 场景只接收已经派生好的 `SceneModel`；Store 不保存 Three.js 或 GSAP 对象。

## 7. 目标目录结构

```text
src/
├── ai/
│   ├── KnowledgeAIProvider.ts
│   ├── LocalKnowledgeProvider.ts
│   ├── OpenAICompatibleProvider.ts
│   ├── schemas.ts
│   └── index.ts
├── animation/
│   ├── GraphMotionDirector.ts
│   ├── cameraTimeline.ts
│   ├── propagationTimeline.ts
│   └── motionTokens.ts
├── components/
│   ├── TopBar.tsx
│   ├── WorldStatus.tsx
│   ├── CommandPalette.tsx
│   ├── GoalLensDrawer.tsx
│   ├── KnowledgeAtlasDrawer.tsx
│   ├── NodeInspector.tsx
│   ├── CausalCorridorDock.tsx
│   ├── KnowledgeDock.tsx
│   ├── MobileSheet.tsx
│   ├── ProgressiveBlur.tsx
│   ├── SpatialConnector.tsx
│   ├── BlurReveal.tsx
│   └── ToastViewport.tsx
├── data/
│   ├── schema.ts
│   ├── lenses.ts
│   └── computerScience/
│       ├── nodes.ts
│       ├── edges.ts
│       ├── clusters.ts
│       ├── content.ts
│       └── manifest.ts
├── design/
│   ├── domainPalette.ts
│   └── visualState.ts
├── graph/
│   ├── GraphRepository.ts
│   ├── traversal.ts
│   ├── causalCorridor.ts
│   ├── layout.ts
│   ├── sceneModel.ts
│   ├── haloBudget.ts
│   ├── curves.ts
│   ├── search.ts
│   └── validation.ts
├── scene/
│   ├── KnowledgeFieldCanvas.tsx
│   ├── KnowledgeEnvironment.tsx
│   ├── DeepField.tsx
│   ├── NeuralGraphLayer.tsx
│   ├── NeuralNodeField.tsx
│   ├── NodeHaloLayer.tsx
│   ├── NodeHitTargets.tsx
│   ├── NeuralSynapseField.tsx
│   ├── SpatialLabels.tsx
│   ├── CameraRig.tsx
│   ├── ScreenProjectionSystem.tsx
│   ├── NeuralPostProcessing.tsx
│   └── shaders/
│       ├── neuralNode.vert.glsl
│       ├── neuralNode.frag.glsl
│       ├── synapse.vert.glsl
│       ├── synapse.frag.glsl
│       ├── deepField.vert.glsl
│       └── deepField.frag.glsl
├── store/
│   ├── knowledgeStore.ts
│   ├── selectors.ts
│   └── persistence.ts
├── styles/
│   ├── tokens.css
│   ├── base.css
│   ├── shell.css
│   ├── panels.css
│   └── responsive.css
├── utils/
│   ├── seededRandom.ts
│   ├── deviceTier.ts
│   └── color.ts
├── App.tsx
└── main.tsx

scripts/
└── validate-knowledge-graph.mjs

docs/
├── DESIGN_SYSTEM.md
├── REFERENCE_MANIFEST.md
├── PERFORMANCE_BUDGET.md
└── RESPONSIVE_ACCEPTANCE.md

THIRD_PARTY_NOTICES.md
```

## 8. 文件级施工说明和代码契约

### 8.1 `src/App.tsx`

职责：读取高层选择状态，生成场景模型，装配 Canvas 和 DOM UI。不得包含节点遍历、镜头计算或动画时间线。

目标代码形态：

```tsx
export function App() {
  const activeLensId = useKnowledgeStore(selectActiveLensId)
  const selectedNodeId = useKnowledgeStore(selectSelectedNodeId)
  const corridor = useKnowledgeStore(selectCorridor)

  const sceneModel = useMemo(
    () => buildSceneModel(graphRepository, { activeLensId, selectedNodeId, corridor }),
    [activeLensId, selectedNodeId, corridor],
  )

  return (
    <UniverseShell>
      <KnowledgeFieldCanvas model={sceneModel} />
      <ExplorerInterface />
    </UniverseShell>
  )
}
```

删除 `phase === 'onboarding'` 分支。画像入口迁移至 GoalLensDrawer 内的次级设置，不再阻塞场景。

### 8.2 `src/data/schema.ts`

节点和边使用 Zod 校验。目标不是节点类型。

```ts
export const KnowledgeNodeSchema = z.object({
  id: z.string().regex(/^cs:[a-z0-9-]+$/),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  type: z.enum(['discipline', 'domain', 'course', 'concept', 'skill', 'practice']),
  domainId: z.string(),
  description: z.string().min(24),
  importance: z.number().min(0).max(1),
  difficulty: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().positive(),
  evidence: z.array(z.string()).min(1),
  assessmentPrompt: z.string().min(1),
  recommendedContent: z.array(z.string()),
  sourceRefs: z.array(z.string()),
})

export const KnowledgeEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relationType: z.enum([
    'contains',
    'prerequisite_hard',
    'prerequisite_soft',
    'related',
    'applies',
    'practice_for',
    'bridge',
  ]),
  reason: z.string().min(8),
  strength: z.number().min(0).max(1),
})
```

### 8.3 `src/data/lenses.ts`

Lens 是对节点和关系的加权配置，不出现在空间层级中。

```ts
export interface KnowledgeLens {
  id: 'overview' | 'postgraduate-408' | 'ai-engineer' | 'game-engineer' | 'frontend-engineer'
  name: string
  queryHints: string[]
  domainWeights: Record<string, number>
  requiredNodeIds: string[]
  relationWeights: Partial<Record<RelationType, number>>
  cameraPadding: number
}
```

默认 `overview`。自定义自然语言目标由 AI Provider 解析成同一结构，不创建新的知识根节点。

### 8.4 `src/data/computerScience/*`

V4 目标节点数为 336，作为世界级知识库的计算机学科切片：

| 领域 | 目标节点数 |
| --- | ---: |
| 数学与计算理论 | 42 |
| 算法与数据结构 | 48 |
| 系统与体系结构 | 44 |
| 编程语言与软件工程 | 40 |
| AI 与数据 | 52 |
| Web 与前端 | 30 |
| 图形与游戏 | 28 |
| 网络与安全 | 30 |
| 工程基础与工具 | 22 |
| 合计 | 336 |

当前 100 节点先迁移并校正，其余节点按领域分批补充。每个可点选概念必须有真实描述、前置理由和至少一条可验证掌握证据，禁止模板占位文案。

`manifest.ts` 记录数据版本、节点数、边数、生成日期和校验摘要。未来扩展物理、医学、艺术时，只新增知识包，不重写图引擎。

### 8.5 `src/graph/GraphRepository.ts`

使用 Graphology `MultiDirectedGraph` 构建唯一图实例，并在初始化时建立索引。

```ts
export class GraphRepository {
  readonly graph: MultiDirectedGraph
  readonly nodeById: Map<string, KnowledgeNode>
  readonly edgeById: Map<string, KnowledgeEdge>

  getNode(id: string): KnowledgeNode | undefined
  incoming(id: string, types?: RelationType[]): GraphNeighbor[]
  outgoing(id: string, types?: RelationType[]): GraphNeighbor[]
  connected(id: string, types?: RelationType[]): GraphNeighbor[]
  hasEdge(source: string, target: string, type?: RelationType): boolean
}
```

不得在 React render 或点击时重复扫描完整 `edges` 数组。

### 8.6 `src/graph/causalCorridor.ts`

这是“整条上下游链路点亮”的核心纯函数。

```ts
export interface CausalCorridor {
  focusNodeId: string
  upstreamNodeDepth: ReadonlyMap<string, number>
  downstreamNodeDepth: ReadonlyMap<string, number>
  lateralNodeDistance: ReadonlyMap<string, number>
  primaryEdgeIds: ReadonlySet<string>
  secondaryEdgeIds: ReadonlySet<string>
  maxUpstreamDepth: number
  maxDownstreamDepth: number
}

export function buildCausalCorridor(
  repository: GraphRepository,
  focusNodeId: string,
  options: { maxDepth: number; lateralHops: 0 | 1 },
): CausalCorridor
```

遍历规则：

1. 上游沿 `prerequisite_hard`、`prerequisite_soft` 反向递归，同时沿 `contains` 寻找必要的领域路径。
2. 下游沿 prerequisite 正向递归，并沿 `practice_for`、`applies` 找到技能和练习。
3. 横向只取一跳 `related` 和 `bridge`，避免选中一个节点后全图被点亮。
4. 使用 BFS 记录最小深度，节点重复出现时保留更短距离。
5. `maxDepth` 桌面默认 6，移动端默认 4。
6. 若图异常形成循环，visited 集合保证终止，validation 仍应报错。

传播延迟：

```ts
const delay = direction === 'upstream'
  ? (maxUpstreamDepth - depth) * 0.055
  : depth * 0.065
```

这样上游信号会从最远处向焦点汇聚，下游信号会从焦点向外扩散。

### 8.7 `src/graph/layout.ts`

位置不写入知识数据。Y 轴只表达认知深度：

```ts
const layerY = {
  discipline: 24,
  domain: 12,
  course: 0,
  concept: -12,
  skill: -12,
  practice: -24,
}
```

X/Z 布局流程：

1. 每个领域有固定宏观锚点和扇区角度。
2. 同领域内按稳定 ID 哈希产生角度，不使用 `Math.random()`。
3. importance 和 centrality 决定离领域中心的半径。
4. 运行 18 至 24 次确定性碰撞松弛，保证核心和最大光晕安全距离。
5. Lens 只生成 `displayPosition` 偏移，不改写 `basePosition`。
6. 位置结果可按数据版本缓存。

### 8.8 `src/graph/sceneModel.ts`

把业务状态转换为渲染状态。视觉状态至少包括：

```ts
type VisualState =
  | 'dormant'
  | 'context'
  | 'lensActive'
  | 'upstream'
  | 'downstream'
  | 'lateral'
  | 'selected'
  | 'recommendedPath'
  | 'searchMatch'
```

`SceneNode` 必须包含 position、domainColor、coreRadius、haloRadius、luminance、labelPriority、propagationDelay。`SceneEdge` 必须包含 sampledCurve、relationType、direction、strength、visualState、propagationDelay。

### 8.9 `src/graph/haloBudget.ts`

光晕不重叠采用两级预算。

世界空间级：布局时使用 `coreRadius + maxHaloRadius + safetyGap` 做稳定碰撞。

屏幕空间级：相机稳定时或最多每秒 12 次，将节点投影到屏幕，使用空间哈希检查圆形光晕碰撞。

```ts
export interface HaloAllocation {
  nodeId: string
  radiusPx: number
  intensity: number
}

export function allocateHaloBudget(
  projectedNodes: ProjectedNode[],
  viewport: ViewportMetrics,
): HaloAllocation[]
```

分配规则：

- 优先级：selected > corridor > search > lensActive > context > dormant。
- 半径范围：桌面 6px 至 26px，手机 4px 至 18px。
- 光晕边缘安全间隔：4px 至 8px。
- 冲突时先收缩低优先级节点，再降低其强度。
- 核心点永远可见，不因预算为零而消失。
- 局部亮度按邻域密度反向补偿，密集区域不能变成一团白色。

### 8.10 `src/scene/NeuralNodeField.tsx`

使用一组 InstancedMesh 或 Points + BufferGeometry 批量渲染神经元核心和膜，不为每个节点创建 React 组件。

每个实例属性：

```ts
aPosition
aCoreRadius
aDomainColor
aState
aLuminance
aPulseDelay
aSelection
```

片元结构：

- 0 至 0.28 半径：高亮核心。
- 0.28 至 0.68：神经元膜和领域色。
- 0.68 至 1：快速衰减的局部晕染。
- 边缘使用 smoothstep，不画实体圆盘。
- selected 瞬间核心向 `--ku-hot-core` 过渡，但 Bloom 半径受控。

每帧只更新 uniform 时间和发生变化的实例属性，不能重新创建 Geometry、Material 或 typed array。

### 8.11 `src/scene/NodeHaloLayer.tsx`

单独渲染屏幕空间光晕，接收 `HaloAllocation[]`。Bloom 不是光晕避让算法，光晕半径必须先由预算系统确定。

实现限制：

- 光晕材质深度写入关闭，深度测试保留。
- 远处节点光晕强度按距离下降。
- 同一节点最多一层主光晕和一层很弱的呼吸膜。
- 永久呼吸幅度不超过 4%，周期 3.2s 至 4.8s，reduced-motion 时关闭。

### 8.12 `src/scene/NodeHitTargets.tsx`

渲染透明 InstancedMesh 作为点击命中层。视觉核心很小，但命中半径不能小于视觉半径的 2.2 倍。

- 全场只使用一个 Raycaster。
- pointermove 每帧最多检测一次。
- 命中结果只有变化时写入 Store。
- 手机点击不能依赖 hover。
- 双击或连续快速点击不得启动两条互相竞争的镜头时间线。

### 8.13 `src/scene/NeuralSynapseField.tsx`

预采样每条曲线 24 至 32 个点，打包为共享 BufferGeometry。顶点 Shader 在屏幕空间扩展成细窄 ribbon，解决 `LineBasicMaterial` 无法稳定控制线宽的问题。

片元 Shader 的传播窗口：

```glsl
float head = clamp((uPhase - aDelay) * aSpeed, 0.0, 1.0);
float signal = exp(-pow((vArc - head) / aWidth, 2.0));
float body = smoothstep(head - aTail, head, vArc);
float alpha = aBaseAlpha + signal * aSignalStrength * body;
```

线的视觉规则：

- dormant：0.06 至 0.10 透明度，1px 等效宽度。
- context：0.14 至 0.22。
- upstream：领域色向白过渡，信号向焦点流动。
- downstream：白热起点向领域色展开。
- primary corridor：熔金色，等效宽度 1.5px 至 2.2px。
- related：使用更大曲率和点划节奏，但不做廉价闪烁。

禁止每条边单独 `useFrame`，禁止用小球沿线移动。

### 8.14 `src/scene/DeepField.tsx`

借鉴 Inspira NeuralBg 的低频 GLSL 思路，移植到现有 R3F Canvas，不创建第二个 WebGLRenderer。

- 不透明度上限约 0.03。
- 噪声只产生缓慢的方向性明暗流动。
- 桌面高性能档启用，移动端与 reduced-motion 关闭。
- 不使用紫色或高饱和青色背景。
- 不能盖过任何知识节点。

### 8.15 `src/scene/NeuralPostProcessing.tsx`

新增 `@react-three/postprocessing`：

- Bloom 使用高 luminanceThreshold、低 radius，只让高亮核心和主走廊进入。
- Noise 极弱，避免纯数字平面感。
- Vignette 轻微，不能产生游戏 HUD 感。
- 色调映射使用 ACESFilmic，颜色空间使用 sRGB。
- 交互期间不启用景深，避免节点变糊和 GPU 峰值。
- 低性能档完全关闭后期，只保留 Shader 自发光。

### 8.16 `src/animation/GraphMotionDirector.ts`

这是镜头和传播的统一调度者，但不直接持有 Store。

```ts
export interface GraphMotionRun {
  focusNodeId: string
  corridorVersion: number
  cameraProgress: number
  afferentPhase: number
  somaPhase: number
  efferentPhase: number
  settlePhase: number
}
```

选择节点时创建一条带标签的 GSAP Timeline：

```ts
const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
tl.addLabel('afferent', 0)
  .to(run, { afferentPhase: 1, duration: 0.45 }, 'afferent')
  .addLabel('somaBurst', 0.36)
  .to(run, { somaPhase: 1, duration: 0.28 }, 'somaBurst')
  .addLabel('efferent', 0.54)
  .to(run, { efferentPhase: 1, duration: 0.61 }, 'efferent')
  .addLabel('settle', 0.92)
  .to(run, { settlePhase: 1, duration: 0.42 }, 'settle')
```

要求：

- React 集成使用 `useGSAP()` 并提供 scope。
- 回调使用 `contextSafe`。
- 新选择发生时 kill 旧 timeline。
- pointermove 高频过渡使用 `quickTo`，不反复创建 tween。
- Shader 读取统一代理值，不为数百节点创建数百 tween。
- reduced-motion 直接把代理设到最终状态，仍保留信息层级。

### 8.17 `src/scene/CameraRig.tsx`

GSAP 只补间 `cameraProgress`，R3F 的 `useFrame` 用它从 `CatmullRomCurve3` 取点并同步相机与 controls target。

路径控制点：当前相机位置、向外抬升的安全点、目标包围盒侧前方、最终位置。路径需检查目标簇包围球，避免穿越图团。

用户 `pointerdown` OrbitControls 时：

1. kill 当前镜头 timeline。
2. 保留当前相机位置和 target。
3. 切换为用户控制。
4. 不取消已经完成的图高亮。

### 8.18 `src/components/TopBar.tsx`

左上：品牌文本和范围。右上：四个图标按钮。

按钮顺序：

1. Search，快捷键 `/` 或 `Cmd/Ctrl + K`。
2. Goal Lens，图标使用项目已有 Phosphor `Aperture` 或 `Target`。
3. Atlas，使用 `MapTrifold`。
4. Settings，使用 `SlidersHorizontal`。

按钮默认无实体背景，hover 时只出现近黑 raised surface。active 状态出现 1px 金色下边缘。全部有 `aria-label` 和 tooltip。

### 8.19 `src/components/CommandPalette.tsx`

借鉴 Raycast 的紧凑命令结构，不做聊天窗口。

- 宽 700px，顶部输入 52px。
- 结果按“节点、领域、目标透镜、操作”分组。
- 每行 44px，左侧领域色小圆点，中间名称和路径，右侧类型或快捷键。
- 选择节点后先关闭 Palette，再启动镜头与传播。
- 输入使用 120ms debounce，搜索 aliases、name、description。
- 键盘支持上下、Enter、Esc。
- 空状态提示可搜索示例，但不写营销文案。

### 8.20 `src/components/GoalLensDrawer.tsx`

内容顺序：

1. 标题“目标透镜”。
2. 说明“透镜只改变关注度，不删除知识”。
3. Overview、考研 408、AI 工程、游戏开发、前端开发五个选项。
4. 自然语言目标输入。
5. 可折叠的个人画像设置。

选择即刻生效，无第二个确认页。自定义目标解析失败时保留原透镜并显示非阻塞错误。

### 8.21 `src/components/KnowledgeAtlasDrawer.tsx`

Atlas 不是传统目录树。它是领域索引和当前空间缩略图：

- 顶部显示 9 个领域及领域色。
- 每个领域显示节点数和当前 Lens 匹配比例。
- 点击领域触发宏观镜头聚焦，不直接展开课程树。
- 下部显示当前选中节点的层级位置和相邻领域桥接数。

### 8.22 `src/components/NodeInspector.tsx`

桌面右侧连续阅读表面，不拆成一组等宽小卡片。信息顺序：

1. 领域色眉题、节点类型和关闭按钮。
2. 节点名称与一行路径。
3. 80 至 140 字概念说明。
4. 上游前置，显示数量和最关键 3 至 6 项。
5. 下游解锁，显示数量和最关键 3 至 6 项。
6. 横向关联。
7. 推荐学习内容。
8. AI 解释和“生成学习路径”。

每个关系项点击后直接在空间中跳转。AI 状态按 nodeId 保存，不允许一个节点加载导致全部按钮进入 loading。

### 8.23 `src/components/SpatialConnector.tsx`

改写 Inspira AnimatedBeam 的 `ResizeObserver + getBoundingClientRect + 二次贝塞尔` 思路，用于选中节点投影位置到 Inspector 边缘之间的单一连接器。

- 只存在一条。
- 节点在相机后方或屏幕外时不渲染。
- 使用 `gradientUnits="userSpaceOnUse"`。
- 信号方向从三维节点指向面板。
- 面板稳定后停止移动渐变，只保留低对比 hairline。

### 8.24 `src/components/ProgressiveBlur.tsx`

改写 Inspira ProgressiveBlur。生成 6 至 8 层窄条，每层有不同 mask 和 blur。只放在 Inspector 左缘、移动端 Sheet 顶缘和 CommandPalette 底缘，不能对整个页面做 backdrop blur。

### 8.25 `src/components/CausalCorridorDock.tsx`

底部中央，替换当前 PathNavigator。桌面结构：

```text
[上游 12] [当前：链表] [下游 18] | [主路径] [全部关系] [返回全景]
```

- 上游、下游按钮可切换只看一侧。
- 主路径和全部关系为互斥模式。
- 返回全景回到当前 Lens，而不是清空 Lens。
- Dock 图标接近指针时最大只放大到 1.08，避免 macOS Dock 仿制感过强。

### 8.26 `src/ai/*`

统一 Provider：

```ts
export interface KnowledgeAIProvider {
  parseGoal(input: string, signal?: AbortSignal): Promise<GoalLensPatch>
  explainNode(input: ExplainNodeInput, signal?: AbortSignal): Promise<NodeExplanation>
  generateLearningPath(input: LearningPathInput, signal?: AbortSignal): Promise<LearningPath>
}
```

- `LocalKnowledgeProvider` 使用图和已编写内容生成稳定输出。
- `OpenAICompatibleProvider` 只通过服务端代理，不把 API Key 放进浏览器。
- 所有响应经过 Zod 校验。
- 远端超时、失败或返回未知 nodeId 时自动回退本地。
- 新请求会 Abort 同节点旧请求，防止竞态覆盖。

## 9. 状态结构和唯一拥有者

`knowledgeStore.ts` 只保存可序列化业务状态：

```ts
interface KnowledgeState {
  profile: ProfileState
  lens: {
    activeLensId: KnowledgeLens['id']
    customLens?: KnowledgeLens
  }
  selection: {
    selectedNodeId: string | null
    hoveredNodeId: string | null
    relationMode: 'primary' | 'all' | 'upstream' | 'downstream'
  }
  panels: {
    openPanel: 'search' | 'lens' | 'atlas' | 'settings' | null
    inspectorOpen: boolean
    mobileSheet: 'inspector' | 'lens' | 'atlas' | null
  }
  camera: {
    intent: CameraIntent
    requestId: number
  }
  propagation: {
    corridorVersion: number
    status: 'idle' | 'running' | 'settled'
  }
  ai: {
    explanationByNode: Record<string, AsyncState<NodeExplanation>>
    learningPath: AsyncState<LearningPath>
  }
}
```

所有可推导值放入 memoized selectors 或 graph 纯函数，不把 336 个 SceneNode 重复写入 Store。

持久化只保存 profile、activeLensId、reducedMotionOverride。增加版本迁移，将旧 `knowledge-universe:profile:v1` 迁移到 `knowledge-universe:v4`。

## 10. 动画时间轴

### 10.1 世界苏醒，首次进入

总时长 0.9s：

- 0.00s：黑场稳定，Canvas 已可交互但不接收点击。
- 0.10s：高中心性节点核心从 0.4 到 1。
- 0.22s：结构突触从中心向外显现。
- 0.34s：次级节点进入，按领域和深度错开。
- 0.54s：TopBar 和 WorldStatus 淡入上移 12px。
- 0.76s：开放交互。

不做 Logo 片头，不让评委等待。

### 10.2 Lens 切换

总时长 0.95s：

- 0.00 至 0.25s：原 Lens 标签和亮度降低。
- 0.12 至 0.72s：节点 displayPosition 向新权重位置插值。
- 0.18 至 0.82s：相机进入新领域包围盒。
- 0.42 至 0.90s：相关标签按 priority 进入。
- 0.90s：重新计算屏幕光晕预算。

### 10.3 节点选择与神经传导

总时长约 1.34s：

- 0.00 至 0.45s `afferent`：最远上游向当前节点汇聚。
- 0.18 至 0.86s `camera`：镜头沿安全弧线靠近。
- 0.36 至 0.64s `somaBurst`：当前神经元白热放电。
- 0.54 至 1.15s `efferent`：下游向外传播。
- 0.78s：Inspector 开始出现。
- 0.92 至 1.34s `settle`：光强稳定，Connector 落位。

### 10.4 面板动画

- 桌面抽屉：280ms，位移 18px，透明度 0 到 1。
- CommandPalette：220ms，位移 10px，scale 0.985 到 1。
- MobileSheet：Motion spring，`stiffness 320`，`damping 34`。
- 关闭比打开快 15%。
- reduced-motion 下不做位移和缩放，只做不超过 120ms 的透明度变化。

## 11. 参考目录接入清单

### 11.1 进入运行时

| 来源 | 借用能力 | 最终落位 | 接入方式 |
| --- | --- | --- | --- |
| GSAP | 带标签时间线、quickTo、React cleanup | `src/animation/*`、CameraRig | 从 npm 安装官方包 |
| Motion | DOM 面板、共享布局、Dock MotionValue | `src/components/*` | 复用现有依赖 |
| Inspira AnimatedBeam | 屏幕锚点和贝塞尔连接器 | `SpatialConnector.tsx` | MIT 算法改写 |
| Inspira ProgressiveBlur | 渐进模糊边缘 | `ProgressiveBlur.tsx` | MIT 算法改写 |
| Inspira Dock | 指针距离映射 | `KnowledgeDock.tsx` | Motion React 重写 |
| Inspira BlurReveal | 解释段落进入 | `BlurReveal.tsx` | 仅用于分组内容 |
| Inspira NeuralBg | 少量低频 GLSL 思路 | `DeepField` Shader | 移入同一 R3F Canvas |
| Impeccable | 黑曜漆面、金色 hairline、材质缓动 | CSS tokens | Apache 2.0 个性化改写 |

### 11.2 只作为规范和模型

| 来源 | 使用内容 | 不进入构建的原因 |
| --- | --- | --- |
| os-taxonomy | 稳定 ID、hard/soft prerequisite、reason、evidence、manifest、DAG 校验 | 小学数据和许可证不适合直接复制 |
| Apple DESIGN | 产品主体优先、触控尺寸、Chrome 退后 | 不复制商标和专有字体 |
| Claude DESIGN | 连续阅读表面、正文层级 | 不复制品牌色和文案 |
| Linear DESIGN | 深黑表面层级、hairline、紧凑控件 | 作为规范而非源码 |
| Runway DESIGN | 全屏视觉主体、零阴影、小圆角 | 作为规范而非源码 |
| Taste Skill | 反 AI 味检查 | 开发审计工具 |
| UI UX Pro Max | Three.js 性能和响应式验收 | 数据表不进入运行时 |

### 11.3 V4 暂不使用

- Anime.js：与 GSAP 职责重叠。
- Lottie Web：当前没有符合品牌的独立 JSON 资产。
- Inspira Vue/Nuxt 运行时：技术栈不匹配。
- OGL：会产生第二个 WebGLRenderer。
- HaloSearch、多层紫色光圈、黑洞、流星、流体光标：破坏视觉方向。

### 11.4 许可文件

新增 `docs/REFERENCE_MANIFEST.md`，记录来源仓库、源文件、借用内容、改写方式、最终落位、是否进入运行时和许可证。

新增 `THIRD_PARTY_NOTICES.md`，至少包括：

- GSAP Standard License 链接。
- gsap-skills MIT。
- Inspira UI MIT。
- Impeccable Apache 2.0 和 NOTICE。
- Awesome Design MD MIT。
- Motion MIT。
- UI UX Pro Max MIT。
- Taste Skill MIT。

若未来实际使用 Marble 数据，再加入 ODbL 和 CC BY-SA 署名。当前 V4 不复制其实质数据。

## 12. 依赖计划

正式施工时执行：

```bash
npm install gsap@^3.15.0 @gsap/react@^2.1.2 @react-three/postprocessing@^3.1.1 postprocessing@^6.39.4
```

继续使用：React、Three、R3F、Drei、Zustand、Motion、Graphology、Zod、Phosphor Icons。

不新增 Tailwind 使用面。当前项目使用 CSS tokens 和模块化全局样式更适合 WebGL 覆层，也避免在这次重建中同时迁移 CSS 技术栈。

升级 Three、R3F 或 Drei 不属于 V4 必要条件。只有现有版本缺少明确 API 时才单独升级并验证兼容性。

## 13. 分阶段施工顺序和退出条件

### 阶段 0：保护基线

操作：

1. 记录 `git status`。
2. 运行现有 `npm test`。
3. 检查 `vite.config.ts` 用户改动。
4. 新增 V4 分支或 worktree，不清理用户未跟踪文件。

退出条件：已有 7 个测试继续通过，用户文件未被覆盖。

### 阶段 1：设计和引用基础

操作：

1. 安装 GSAP 和 postprocessing。
2. 新建 tokens、domainPalette、motionTokens。
3. 新建 DESIGN_SYSTEM、REFERENCE_MANIFEST、THIRD_PARTY_NOTICES。
4. 拆分 styles.css，但暂时保持旧页面可运行。

退出条件：生产构建通过，旧页面无功能回归，所有新令牌可在 Story/临时样本中检查。

### 阶段 2：知识本体和数据迁移

操作：

1. 建立 Zod schema。
2. 将目标从节点剥离成 lenses。
3. 将当前 100 节点迁移到新类型。
4. 补充至 336 节点和多关系边。
5. 为每条前置边填写 reason。
6. 建立 manifest 和验证脚本。

退出条件：无重复 ID、无悬空边、hard prerequisite 为 DAG、每个概念可达、每个 practice 有 `practice_for`、所有内容字段通过 schema。

### 阶段 3：图算法和场景模型

操作：

1. 建立 GraphRepository。
2. 实现上下游 BFS、横向一跳和因果走廊。
3. 实现确定性布局和碰撞松弛。
4. 实现 SceneModel 和 HaloBudget。
5. 增加完整单元测试。

退出条件：点击任意测试节点都返回稳定的上游、下游、主边和传播深度；相同数据每次布局完全一致；光晕预算无负数和 NaN。

### 阶段 4：神经元和突触白模

操作：

1. 替换 KnowledgeNodeMesh 为批量 NeuralNodeField。
2. 新建 HaloLayer 和 HitTargets。
3. 替换 KnowledgeCurves 为 batched NeuralSynapseField。
4. 接入九领域颜色和视觉状态。

退出条件：336 节点可见且可点击；无胶囊；默认节点之间可辨；点击后整条上下游正确着色；draw call 达到预算。

### 阶段 5：镜头和统一传播

操作：

1. 接入 GraphMotionDirector。
2. 重写 CameraRig。
3. 将 Shader uniform 与同一 Timeline 代理连接。
4. 实现用户打断、连续选择、Esc 和 R。

退出条件：快速连续点击 20 次不残留 timeline；相机不穿过节点簇；用户拖拽可立即接管；reduced-motion 有稳定最终状态。

### 阶段 6：产品 UI

操作：

1. 删除首次 Onboarding 渲染链路。
2. 实现 TopBar、WorldStatus、CommandPalette。
3. 实现 GoalLensDrawer 和 Atlas。
4. 重写 NodeInspector。
5. 实现 SpatialConnector、ProgressiveBlur、CausalCorridorDock。
6. 实现统一 MobileSheet。

退出条件：首次访问无需确认即可探索；只存在一个大型抽屉；所有图标有 aria-label；键盘和触控均完成主流程；手机无面板重叠。

### 阶段 7：AI Provider

操作：

1. 建立 Provider 接口和 Zod 输出。
2. 完成本地解释、目标解析和学习路径。
3. 增加可选 OpenAI Compatible 代理。
4. 实现 Abort、超时、回退和按节点缓存。

退出条件：断网时全部主流程可用；远端返回非法 nodeId 会回退；同节点新请求取消旧请求。

### 阶段 8：视觉收敛和后期

操作：

1. 接入 DeepField。
2. 接入受控 Bloom 和 tone mapping。
3. 完成领域光色平衡和局部亮度归一化。
4. 调整体积感、Connector 和关键面板边缘。
5. 删除所有临时调试视觉。

退出条件：没有节点光晕粘连；选中节点最亮但不过曝；非相关节点仍能建立世界规模；截图不呈现紫蓝 AI 模板感。

### 阶段 9：响应式、性能和验收

操作：

1. 建立 Playwright 配置和 E2E。
2. 运行规定屏幕矩阵。
3. 执行性能档降级测试。
4. 构建并在静态服务器验证。
5. 完成评委 90 秒演示彩排。

退出条件：第 15 节所有验收项通过后停止扩张功能，只做缺陷修复和微调。

## 14. 测试计划

### 14.1 单元测试

- Schema 接受合法节点并拒绝缺字段节点。
- GraphRepository 的 incoming/outgoing 关系方向正确。
- CausalCorridor 对链表、进程、TCP、反向传播等代表节点返回预期上下游。
- 循环数据不会死循环，validation 会失败。
- Lens 权重不改变原始节点和边。
- Layout 在同一版本下确定性一致。
- HaloBudget 在密集、边缘、超宽和手机视口中不重叠或按规则降级。
- LearningPath 每一步都有真实图连接。

### 14.2 组件测试

- Esc 的关闭优先级正确。
- CommandPalette 键盘导航正确。
- Lens 切换更新状态但不删除节点。
- NodeInspector 的上游和下游可跳转。
- AI 请求竞态和错误回退正确。
- 移动端 Sheet 与 Dock 不同时占据底部。

### 14.3 Playwright 流程

至少覆盖：

1. 首次访问直接看到 Canvas 和节点。
2. 选择 408 Lens。
3. 搜索并选择“链表”。
4. 验证 Inspector、上游数、下游数和 Dock 出现。
5. 点击一个前置节点并验证镜头请求更新。
6. 返回 Lens 全景。
7. 离线模式生成解释和学习路径。
8. reduced-motion 模式完成同样流程。

### 14.4 屏幕矩阵

- 320x568。
- 375x812。
- 390x844。
- 414x896。
- 768x1024。
- 1024x768。
- 1440x900。
- 1920x1080。
- 2560x1080。

每个尺寸检查：品牌不重叠、操作可点、节点无遮挡、Inspector/Sheet 可读、Dock 不遮挡正文、标签不越界。

## 15. 性能预算

目标设备和预算：

- 中高端桌面：稳定 55 至 60 FPS。
- 集显笔记本：不低于 45 FPS。
- 近三年主流手机：交互时不低于 40 FPS。
- 首次可交互：本地开发冷启动外，生产静态资源目标 2.5s 内。
- WebGL draw calls：桌面目标 20 至 25 内，移动端 16 内。
- Geometry/Material：初始化后 render loop 内零创建。
- DPR：桌面最高 2，普通档 1.5，移动低性能档 1。
- 标签 DOM：桌面同时不超过 32 个，手机不超过 12 个。
- 屏幕投影与 HaloBudget：最多 12Hz，不随 60Hz 全量重算。
- Raycaster：共享一个，每帧最多一次。

性能档：

```text
high: DeepField + Bloom + 全标签预算 + 32 曲线采样
medium: Bloom + 70% 标签预算 + 24 曲线采样
low: 无后期 + 35% 标签预算 + 16 曲线采样 + DPR 1
```

页面隐藏时暂停环境 Shader 和非必要动画。所有连续动画使用 delta time。

## 16. 无障碍和降级

- WebGL 不可用时显示可搜索的语义知识列表和节点详情，不显示空白页。
- 所有图标按钮有可见 tooltip 和 `aria-label`。
- 颜色不是唯一状态提示，使用文字、线宽、亮度和位置共同表达。
- 焦点环使用高对比 hairline，不用默认蓝色 glow。
- 可用键盘打开搜索、移动结果、选择节点、关闭面板、返回全景。
- `prefers-reduced-motion` 关闭世界苏醒、呼吸和传播移动，但直接显示完整上下游高亮。
- 屏幕阅读器通过 CommandPalette 的语义结果探索节点，不创建 336 个隐藏按钮常驻 DOM。

## 17. 失败处理

- 数据校验失败：开发环境阻止启动并打印具体 nodeId/edgeId；生产环境加载上一版合法知识包。
- WebGL context lost：暂停 Timeline，显示恢复提示；恢复后重建 GPU buffer 并保持当前选择。
- AI 超时：8s 终止远端请求并回退 Local Provider。
- 搜索无结果：保留输入，建议领域和相近别名，不自动创建虚构节点。
- 镜头目标无布局位置：取消镜头动画，保留选中状态并记录错误。
- 性能连续低于 35 FPS：自动降低一档，不能在同一会话频繁来回切档。

## 18. 文件迁移清单

保留但重写内部：

- `src/App.tsx`
- `src/store/knowledgeStore.ts`
- `src/graph/curves.ts`
- `src/graph/validation.ts`
- `src/components/NodeInspector.tsx`
- `src/components/ExplorerInterface.tsx`
- `src/scene/UniverseCanvas.tsx`，最终可重命名为 KnowledgeFieldCanvas。

停止引用并在替代完成后删除：

- `src/components/OnboardingScreen.tsx`
- `src/components/ExplorerHeader.tsx`
- `src/components/PathNavigator.tsx`
- `src/scene/KnowledgeNodeMesh.tsx`
- `src/scene/KnowledgeCurves.tsx`
- `src/scene/CameraController.tsx`
- 旧 `src/graph/types.ts` 中的 goal、direction、BranchId 和单 parentId 定义。

数据迁移完成后停止直接使用：

- 单文件 `src/data/knowledgeGraph.ts`。
- `src/ai/localKnowledgeAI.ts` 的人工延时和硬编码路径。
- 单文件 `src/styles.css`，main.tsx 改为引入拆分后的样式入口。

任何删除都必须在新组件、测试和构建通过后进行，不提前破坏现有可运行版本。

## 19. 最终验收标准

功能：

- 打开即进入三维知识空间。
- 默认计算机知识全景可见。
- 408、AI、游戏、前端 Lens 可切换。
- 点击任意代表性中层节点，上游和下游完整点亮。
- 搜索、镜头、详情、知识地图、返回全景均可用。
- AI 本地回退可解释节点并生成合法路径。

视觉：

- 节点全部为清晰发光神经元，无暗淡胶囊。
- 多领域颜色明确但不彩虹化。
- 光晕不粘连，亮度不过曝。
- 曲线自然，有突触传导感。
- 黑色系可读，面板克制，无廉价玻璃和紫蓝 AI 味。
- 海洋高级感来自空间、光和节奏，不来自字面背景。

工程：

- `npm test`、类型检查、生产构建、Playwright 主流程通过。
- 控制台无未处理异常和 React key 警告。
- 336 节点数据校验通过。
- 一个 WebGLRenderer，无 render loop 资源创建。
- 达到性能预算或正确进入降级档。
- 第三方来源和许可证记录完整。

## 20. V4 终止条件和后续边界

当第 19 节全部通过，V4 即完成。此后只允许视觉微调、内容校对、性能修复和比赛演示优化，不再把以下内容加入本轮：

- 登录和账号体系。
- 云端学习进度同步。
- 完整答题系统。
- 图数据库后端。
- 多人协作。
- 真实世界所有学科数据。
- 语音助手或聊天窗口。
- VR/AR 模式。

未来扩展世界知识库时，按 `KnowledgePackage` 加载新学科包，共用同一 GraphRepository、SceneModel、Shader 和交互系统。V4 的成功标准不是一次塞入所有知识，而是证明这个宇宙可以在不重写核心架构的前提下持续扩张。

## 21. 施工开始前的最终检查表

- [ ] 已保留当前工作区用户改动。
- [ ] 已确认 V4 文档为唯一实施基线。
- [ ] 已创建独立施工分支或 worktree。
- [ ] 已记录参考代码的许可证和最终落位。
- [ ] 已确认只使用一个 WebGLRenderer。
- [ ] 已确认 GSAP、Motion、R3F 三者职责不重叠。
- [ ] 已确认目标是 Lens，不是知识节点。
- [ ] 已确认节点位置不写入内容数据。
- [ ] 已确认因果走廊同时计算上游和下游。
- [ ] 已确认节点和边采用批量渲染。
- [ ] 已确认 HaloBudget 在 Bloom 之前执行。
- [ ] 已确认手机与 reduced-motion 有完整退化方案。
- [ ] 已确认断网不影响评委主流程。
- [ ] 已确认达到验收标准后停止扩张范围。
