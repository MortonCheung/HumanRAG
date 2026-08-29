# iTeach V3 黑色知识神经空间施工方案

文档状态：可直接施工  
上位约束：[knowledge-neural-space-v3-foundation.md](./knowledge-neural-space-v3-foundation.md)  
目标：在现有 React 19、R3F、Three.js、Drei、Zustand、Motion 项目上完成定向重构，不迁移框架，不复制参考案例内容。

## 1. 设计读取

Reading this as: 面向比赛评委和大学生的全屏空间学习产品，采用克制的黑色知识场、确定性关系图、可审查的 AI 路径和极低密度界面。

```text
DESIGN_VARIANCE: 8
MOTION_INTENSITY: 6
VISUAL_DENSITY: 3
```

三份新案例只贡献施工写法：

- 每个可见元素明确位置、尺寸、层级与响应式变化。
- 每个交互明确触发、动画、结束、取消和清理行为。
- 每个组件明确依赖、输入、输出和状态所有者。
- 每个页面状态明确成功、加载、错误和降级。
- 每项视觉结果均能通过固定视口截图验收。

禁止复制案例中的视频背景、星际旅行内容、着陆页卡片、液态玻璃堆叠、着陆页导航、字体搭配和营销文案。

## 2. 当前实现中必须退休的结构

| 当前结构 | 处理方式 | 原因 |
| --- | --- | --- |
| `GoalSelector` 顶部方向选择器 | 删除组件和 store 状态 | 与主页面纯净要求冲突 |
| `SceneContext` 左侧大目标标题 | 删除常驻版本 | 重复场景内目标标签 |
| `LayerIndex` | 删除 | 五层已由 Y 轴表达 |
| `scene-controls-copy` | 删除 | 用户不需要长期操作提示 |
| `LayerField` 五个矩形框 | 删除 | 与知识边混淆，像 CAD |
| 端点直连 `Line` | 替换为稳定曲线 | 降低切穿和三角网噪声 |
| 固定右侧 `DetailPanel` | 替换为空间锚定 `NodeInspector` | 避免后台侧栏感 |
| 大型底部 `LearningPath` | 替换为 48px `PathNavigator` | 路径主体回到三维场景 |
| `MobileNav` 三键底栏 | 删除 | 与顶部必要操作重复 |
| 每帧相机 lerp | 替换为 `CameraControls.setLookAt` | 释放用户控制权 |
| 白色纸面 Token | 全量替换为黑色 Token | 保持单一主题 |

## 3. 文件级施工结构

```text
src/
  App.tsx
  styles.css
  components/
    BrandMark.tsx
    ExplorerInterface.tsx
    ExplorerHeader.tsx          新增：极简场景操作
    NodeInspector.tsx           新增：空间锚定详情
    PathNavigator.tsx           新增：紧凑路径导航
    OnboardingScreen.tsx
  scene/
    UniverseCanvas.tsx          只负责编排 Canvas
    KnowledgeNodeMesh.tsx       新增：节点几何、材质、标签
    KnowledgeCurves.tsx         新增：曲线边和路径信号
    CameraController.tsx        新增：一次性相机意图
    ScreenAnchorTracker.tsx     新增：将选中节点投影到 CSS 变量
  graph/
    types.ts
    relevance.ts
    curves.ts                   新增：稳定曲线纯函数
    validation.ts               新增：图数据验证
  store/
    knowledgeStore.ts
  data/
    knowledgeGraph.ts
    knowledgeGraph.test.ts
```

原则：

- `App.tsx` 只组装状态、场景和 DOM 层。
- `scene` 不生成业务数据，只消费 `SceneModel`。
- `graph` 不读 DOM，不操作相机。
- `store` 不保存逐帧坐标。
- `NodeInspector` 不自己计算关系，使用图查询函数。
- CSS 变量接收屏幕投影，避免逐帧写 React state。

## 4. 全局视觉 Token

在 `src/styles.css` 的 `:root` 唯一定义：

```css
:root {
  --canvas: #06080b;
  --canvas-fog: #090d12;
  --surface: #0c1117;
  --surface-raised: #111820;
  --surface-solid: #151c24;
  --text: #f3f5f7;
  --text-soft: #9da7b3;
  --text-faint: #626d79;
  --hairline: rgb(225 235 245 / 0.1);
  --hairline-strong: rgb(225 235 245 / 0.2);
  --accent: #9fc7ff;
  --accent-hot: #dcebff;
  --danger: #ff8b82;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --radius-control: 10px;
  --radius-panel: 16px;
  --z-canvas: 0;
  --z-atmosphere: 5;
  --z-interface: 20;
  --z-inspector: 40;
  --z-onboarding: 60;
}
```

形状规则：普通按钮 10px，主要浮层 16px，圆形仅用于图标按钮。不得出现新的胶囊体系。

页面、Canvas、fog 和 `meta theme-color` 都使用同一黑色家族。不得在任何状态切回浅色页面。

## 5. DOM 层总体构图

### 5.1 桌面 1440×900

- Canvas：`position:absolute; inset:0`，占满全部视口。
- 品牌：左上 `top:24px; left:28px`，高度 36px。
- 场景操作：右上 `top:20px; right:24px`，三个 38px 图标按钮，间隔 6px。
- `NodeInspector`：宽 360px，最大高 560px，由选中节点屏幕坐标决定，默认出现在节点右侧 34px。
- `PathNavigator`：底部居中，宽 `min(680px, calc(100vw - 48px))`，高 48px，`bottom:20px`。
- 主页面不渲染其他常驻文本。

### 5.2 超宽屏

- 品牌和操作边距增长到 `3vw`，上限 56px。
- 激活子图限制在中央约 62% 宽度内。
- `NodeInspector` 最大宽 380px，不随屏幕无限放大。
- 相机计算使用激活子图包围球，不使用更多空白填充节点。

### 5.3 平板 768-1024px

- 品牌 `left:18px`，操作 `right:16px`。
- `NodeInspector` 宽 `min(340px, 42vw)`。
- 可见标签上限从桌面约 14 个降到 9 个。
- 节点点击半径增加 15%。

### 5.4 手机小于 768px

- 品牌 `top:calc(12px + safe-area); left:14px`。
- 顶部操作只显示全景与重设两个图标，路径入口在存在目标时显示为第三个图标。
- `NodeInspector` 改为底部 sheet：左右 8px，初始最大高 46dvh，用户内容内部滚动。
- `PathNavigator` 位于 sheet 上方或底部安全区，高 44px。
- 目标子图默认只显示目标、方向、当前课程和当前知识路径标签。
- 不渲染任何移动端固定三键导航。

## 6. `ExplorerHeader`

文件：`src/components/ExplorerHeader.tsx`

```ts
interface ExplorerHeaderProps {
  hasGoal: boolean
  onOverview(): void
  onGeneratePath(): void
  onReset(): void
}
```

结构：

```tsx
<header className="explorer-header">
  <BrandMark />
  <nav aria-label="空间操作">
    <IconAction label="返回全景" icon={Compass} />
    {hasGoal && <IconAction label="生成学习路径" icon={Path} />}
    <IconAction label="重新设置画像" icon={Crosshair} />
  </nav>
</header>
```

按钮：

- 38×38px。
- 默认 `background: rgb(12 17 23 / 0.66)`，1px 内边线。
- hover 仅提高背景与图标明度，不扩大按钮。
- active 使用 `transform: translateY(1px)`。
- focus-visible 使用 2px `--accent` 轮廓。
- 每个按钮必须有 `aria-label` 和 CSS tooltip，tooltip 延迟 420ms。

不出现“当前方向”文字，也不显示目标名称。

## 7. 节点系统

文件：`src/scene/KnowledgeNodeMesh.tsx`

```ts
interface KnowledgeNodeMeshProps {
  node: SceneNode
  hovered: boolean
  onHover(id: string | null): void
  onSelect(id: string): void
}
```

### 7.1 几何语义

| 类型 | 几何 | 基准尺寸 | 意义 |
| --- | --- | --- | --- |
| goal | 圆角长条 | 3.0×0.32×1.08 | 目标锚点 |
| direction | 圆角长条 | 2.1×0.26×0.82 | 方向入口 |
| course/skill | 圆角短条 | 1.22×0.22×0.56 | 学习模块 |
| knowledge | 低面数八面体 | 半径 0.34 | 概念节点 |
| practice | 小圆环 | 半径 0.23 | 可验证练习 |

圆角条使用 Drei `RoundedBox`。知识点和练习使用共享 geometry，通过 `useMemo` 或模块级常量创建，不为每个节点重复创建 geometry。

### 7.2 材质状态

```text
inactive:   opacity .08, scale .72, emissive 0
contextual: opacity .24, scale .88, emissive 0
active:     opacity .88, scale 1.04, emissiveIntensity .08
selected:   opacity 1, scale 1.18, emissiveIntensity .18
hovered:    在当前状态上额外 scale +.06
```

背景节点 `depthWrite=false`。激活与选中节点 `depthWrite=true`。只有选中节点创建第二层 1.08 倍轮廓，不为 100 个节点长期渲染外轮廓。

### 7.3 节点动画

- 位置使用 `THREE.MathUtils.damp` 或 Vector3 damp，目标投影变化时间约 620ms。
- 尺寸与透明度时间约 360ms。
- 选中节点允许 1.8 秒一次、振幅不超过 4% 的明度呼吸。
- inactive 节点不循环动画。
- reduced motion 下直接设置最终位置、尺寸和透明度。

### 7.4 标签

- 默认为无背景文字，`font-size:11px`，颜色 `--text-soft`。
- 目标 16px，方向 13px，课程 11px，知识 10px。
- 仅目标、激活方向、最多 8 个激活课程、悬停节点、选中节点和选中节点一跳邻居显示。
- 选中标签可以使用 `rgb(12 17 23 / .84)` 局部底衬和 1px 边线。
- 标签不重复显示“目标、方向、知识点”等类型。
- 标签 `pointer-events:none`。

## 8. 曲线关系系统

纯函数文件：`src/graph/curves.ts`

```ts
export function stableHash(value: string): number
export function buildEdgeCurve(
  edge: KnowledgeEdge,
  source: Vector3Tuple,
  target: Vector3Tuple,
): THREE.Curve<THREE.Vector3>
export function sampleCurve(curve: THREE.Curve<THREE.Vector3>, segments = 24): Vector3Tuple[]
```

### 8.1 曲线规则

- `hierarchy`：`CubicBezierCurve3`。控制点分别从源、目标沿 Y 轴移动 38% 距离，再加入不超过 1.8 世界单位的稳定侧弯。
- `prerequisite`：`QuadraticBezierCurve3`。中点沿 XZ 垂向偏移，Y 抬升 `clamp(distance*.1, .6, 2.4)`。
- `related`：二次贝塞尔，弯曲略大于 prerequisite，普通状态只在局部图显示。
- `practice_for`：从知识点向练习层下沉，使用较短的三次曲线。
- 弯曲正负号由 `stableHash(edge.id)` 决定。
- 所有采样点刷新后稳定。

### 8.2 可见性

```text
无选中节点：只显示目标子图的层级边和少量前置边
选中节点：显示祖先路径、当前节点一跳关系和推荐路径
非相关边：opacity .018
上下文边：opacity .09
激活层级边：opacity .25
选中路径：opacity .86, lineWidth 1.7
```

### 8.3 路径信号

文件：`src/scene/KnowledgeCurves.tsx`

- `SceneModel.learningPathEdgeIds` 只保存推荐路径中能够映射到真实知识边的段。
- 相邻路径节点之间不存在真实边时保留导航顺序，但不绘制幽灵连接。
- 每条真实路径曲线上最多一个 0.045-0.065 半径的信号点。
- 信号点沿曲线从 0 到 1 运动，速度按曲线长度归一化。
- 最多同时渲染 18 个信号点。
- 关闭路径时立即卸载信号点。
- reduced motion 下不移动，只显示曲线。

## 9. 目标投影与局部图

文件：`src/graph/relevance.ts`

新签名：

```ts
export function buildSceneModel(input: {
  goalId: string | null
  selectedNodeId: string | null
  hoveredNodeId: string | null
  learningPath: string[]
  focused: boolean
}): SceneModel
```

规则：

1. 目标后代节点获得目标相关度。
2. 目标分支的课程、知识和练习按层级分别获得 0.90、0.82、0.74。
3. 前置邻居为 0.48，普通关联为 0.30，其他节点为 0.08。
4. 选中节点时，一跳邻居最低提升到 contextual；与选中节点无关的普通激活边被隐藏。
5. hovered 节点只临时提高自身标签和直接边，不改变相机。
6. learningPath 节点最低为 active，并生成独立 `pathSegments`。
7. 原始 `basePosition` 不变，派生 `displayPosition` 只写入 `SceneNode`。

激活分支向中心移动约 72%，无关分支沿自己的象限外移 4.5-7 世界单位。位置只由数据和目标决定，不使用随机数。

## 10. 相机控制

文件：`src/scene/CameraController.tsx`

使用 Drei `CameraControls` 替换 `OrbitControls + useFrame lerp`。

```ts
interface CameraControllerProps {
  intent: CameraIntent
  model: SceneModel
}
```

### 10.1 全景

- 对所有非 inactive 节点或全图节点计算包围球。
- 视角方向固定为归一化 `[0.72, 0.48, 1]`，保证演示稳定。
- 距离由包围球半径和 44° FOV 推导，桌面乘 1.2，窄屏乘 1.42。

### 10.2 目标

- 对目标分支 active 节点计算包围球。
- 目标中心作为 `lookAt`。
- 距离 clamp 到 22-58 世界单位。
- 过渡使用 `setLookAt(..., true)`，约 850ms。

### 10.3 节点

- 根据节点类型使用 8-19 世界单位距离。
- 详情默认在节点右侧出现，因此桌面构图给右侧保留约 390px 安全区。
- 移动端节点位于详情 sheet 以上 40% 视口中心。

### 10.4 控制权

- 新 `intent.id` 才触发一次相机动画。
- 用户开始拖拽时调用 `controls.stop()` 取消当前过渡。
- 动画完成后不再每帧写相机位置。
- 下一次 intent 从当前相机姿态继续。

## 11. 选中节点屏幕锚点

文件：`src/scene/ScreenAnchorTracker.tsx`

```ts
interface ScreenAnchorTrackerProps {
  selectedNode?: SceneNode
}
```

在 `useFrame` 中：

1. 将 `displayPosition` 投影为 NDC。
2. 转为屏幕像素。
3. 直接写入 `.app-shell` 的 `--node-screen-x` 和 `--node-screen-y`。
4. 只有像素变化超过 0.5 时写 DOM。
5. 组件卸载时清除变量。

不得把屏幕坐标写进 Zustand 或 React state。

## 12. `NodeInspector`

文件：`src/components/NodeInspector.tsx`

桌面定位：

```css
left: clamp(20px, calc(var(--node-screen-x) * 1px + 34px), calc(100vw - 380px));
top: clamp(86px, calc(var(--node-screen-y) * 1px - 170px), calc(100dvh - 580px));
```

结构分三级：

```text
一级始终可见：类型、名称、关闭、路径一句话、概念说明
二级默认展开：前置、后继、强关联
三级按操作生成：个性化解释、推荐内容
```

视觉：

- 宽 360px，最大高 560px。
- 背景 `rgb(12 17 23 / .88)`，blur 18px，1px 内边线。
- 标题 28px，正文 13px/1.65。
- 关系项用无边框文本行，不使用一组胶囊。
- 只允许一个主要按钮：“生成个性化解释”。
- 加载状态保留最终文字行高，用三条骨架线，不显示圆形 spinner。
- 本地降级只显示一句 `使用本地知识服务生成`，不使用 Sparkle 图标。
- Escape 或关闭按钮返回目标视图。

手机：固定 bottom sheet，标题和摘要始终可见，详细内容内部滚动。

## 13. `PathNavigator`

文件：`src/components/PathNavigator.tsx`

```ts
interface PathNavigatorProps {
  path: string[]
  selectedNodeId: string | null
  onSelect(id: string): void
  onClose(): void
}
```

布局：

```text
[路径 18] [上一节点] [03 / 18  当前节点名] [下一节点] [关闭]
```

- 单行 48px，不展示 18 个卡片。
- 当前索引优先取 selectedNodeId 在 path 中的位置，否则为 0。
- 上一节点和下一节点直接调用 `onSelect`，驱动相机。
- 两端 disabled 有明确视觉状态。
- 手机隐藏“路径 18”，保留前后、当前名称和关闭。

## 14. 首次画像页

文件：`src/components/OnboardingScreen.tsx`

### 14.1 桌面

- 全屏黑色主题，Canvas 仍在后方，但降低到 20% 对比。
- 顶部品牌左 28px，隐私说明右 28px。
- 内容区域 `inset:88px 28px 28px`，不使用完整大卡边框。
- 左栏约 54%，右栏 420-470px。
- 左栏只保留一句产品定义、主标题、简短说明和一条五层纵向关系。
- 右栏使用单一深色表单面，不增加快捷目标胶囊墙。

文案：

```text
小标题：目标驱动的三维学习导航
主标题：告诉系统，你准备抵达哪里。
说明：我们会保留完整知识图谱，只把与你当前目标有关的路径带到眼前。
表单标题：建立本次探索的起点
主按钮：生成知识空间
```

### 14.2 字段

- 专业、当前身份、学习目标，标签始终在输入上方。
- 输入高 48px，textarea 最小高 86px。
- 错误在字段下方，颜色 `--danger`。
- 快捷目标改为四行文本选择，不做卡片或胶囊：每行 42px，底部单边线，选中时右侧出现 Check。
- 提交加载时按钮文案 `正在组织知识关系`，按钮宽高不变化。

### 14.3 手机

- 单列滚动。
- 先显示 240-300px 简化叙事，再显示表单。
- 主按钮位于表单末尾，不做固定底部按钮。
- 键盘弹起时页面可滚动到当前输入。

## 15. Store 改造

删除：

```text
isGoalMenuOpen
toggleGoalMenu
closeGoalMenu
```

保留并明确所有权：

```text
profile                UserProfile
selectedGoalId         目标投影
selectedNodeId         局部图与详情
hoveredNodeId          临时场景反馈
cameraIntent           一次性相机命令
learningPath           AI 或本地生成的路径
isPathRibbonOpen       PathNavigator 是否显示
aiStatus               idle/loading/success/fallback/error
explanationByNode      节点解释缓存
```

所有 timeout 保存句柄或使用可取消请求序列号，避免重置画像后旧请求写回新状态。

## 16. 数据验证

新增 `src/graph/validation.ts`：

```ts
export interface GraphValidationIssue {
  code: string
  message: string
  nodeId?: string
  edgeId?: string
}

export function validateKnowledgeGraph(graph: KnowledgeGraphData): GraphValidationIssue[]
export function hasPrerequisiteCycle(graph: KnowledgeGraphData): boolean
```

检查：

- 节点和边 ID 唯一。
- 无悬空引用、自关联和重复边。
- 节点类型与 layer 合法。
- hierarchy 只连接相邻合法层级。
- prerequisite 无环。
- 100 个节点和四个分支保持不变。
- 默认 408 路径节点全部存在。

## 17. 动画与清理

| 动画 | 触发 | 时间 | 结束状态 | 取消 |
| --- | --- | --- | --- | --- |
| 画像进入空间 | 提交成功 | 850ms | goalFocused | 新 intent 覆盖 |
| 目标重排 | goalId 变化 | 620ms | 派生位置 | 新目标覆盖 |
| 节点聚焦 | 点击节点 | 680ms | nodeFocused | 用户拖拽或新节点 |
| Inspector 进入 | selectedNodeId 出现 | 320ms | 稳定浮层 | 关闭或新节点替换 |
| 路径出现 | generate 完成 | 420ms | 路径曲线和导航 | 关闭路径 |
| AI 骨架 | request 开始 | 至结果返回 | 正文替换 | 请求序号失效 |

DOM 动画使用 Motion 或 CSS transform/opacity。Three 动画使用 R3F `useFrame` 或 CameraControls。不得让 Motion 和 Three 同时写同一个属性。

## 18. 性能预算

- DPR：移动端最高 1.35，桌面最高 1.65。
- 100 节点保持共享 geometry。
- 非路径边不创建运动对象。
- 路径信号最多 18 个。
- Html 标签桌面最多约 14 个，手机最多约 7 个。
- 不增加全局粒子系统、后处理 Bloom、DOF 或阴影贴图。
- Canvas `powerPreference: high-performance`。
- 目标是常见笔记本 55-60fps，手机稳定大于 30fps。

## 19. 无障碍与错误处理

- 保留 `AccessibleNavigator` 作为屏幕阅读器节点导航。
- 所有图标按钮有可读标签。
- 焦点环不被 `outline:none` 移除。
- reduced motion 禁止路径信号和明度呼吸，相机直接或快速到位。
- reduced transparency 使用实色 `--surface-solid`。
- WebGL 创建失败时显示可操作的降级页，保留重新设置画像和节点文本导航。
- localStorage 失败时继续使用内存状态。
- AI 失败时回退本地服务，不弹阻塞模态框。

## 20. 固定浏览器验收路径

每个视口均执行：

1. 清空 `knowledge-universe:profile:v1`。
2. 打开画像页。
3. 输入专业 `软件工程`。
4. 输入身份 `本科生`。
5. 输入目标 `计算机考研408`。
6. 提交并等待目标相机完成。
7. 检查相关节点激活，无关节点仍在远景。
8. 点击 `数据结构`。
9. 点击 `线性表`。
10. 打开个性化解释，确认本地降级结果。
11. 生成学习路径，使用下一节点按钮移动。
12. 返回全景。
13. 检查控制台错误和未处理 Promise。

固定截图：

```text
1440×900   onboarding、goal、node、path
1920×1080  goal、node
2560×1080  goal、node
1024×768   onboarding、node
390×844    onboarding、goal、node、path
```

## 21. 终止条件

只有同时满足以下条件才停止：

- `npm run typecheck` 成功。
- `npm test` 成功。
- `npm run build` 成功。
- 图数据校验零错误。
- 固定浏览器路径全部可完成。
- 桌面、超宽屏、平板和手机无横向溢出。
- 控制台无 error。
- 主页面没有顶部方向选择器、层级图例、固定侧栏和大型底部路径面板。
- 所有知识边为稳定曲线。
- 相机动画后用户可以自由控制，不发生回弹。
- 最终画面读作可探索的知识空间，不读作黑色 Dashboard。
