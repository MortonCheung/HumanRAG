# iTeach V8 三维连续体验施工指南

## 1. 本轮目标

本轮不是继续给现有页面叠加动效，而是修正体验的空间连续性：

1. 开屏与知识空间共享同一棵知识树、同一个 WebGL Canvas、同一台相机。
2. 开屏为俯视造成的二维视觉假象，进入时镜头连续转为三维斜视，路由切换不销毁场景。
3. 神经信号始终沿关系曲线自然流动，与 hover、idle 状态解耦。
4. 所有可见节点都有独立、稳定、尺寸足够的拾取代理。
5. 右侧节点面板只存在一个外壳：hover 显示名称，click 在原地展开详情。
6. 自定义知识库先创建一棵独立三维知识树，再在同一空间内添加节点。
7. 新节点经历“光口打开 → 卡片出现 → 内容定制 → 凝聚为节点 → 空间属性编辑 → 放置/连线 → 原子提交”。
8. 所有转场都必须保留对象身份和方向感，支持从来源返回来源。

## 2. 不可妥协的工程边界

- `/` 与 `/universe` 必须置于同一个 `SpatialExperienceShell` 下，禁止再次创建第二个预览 Canvas。
- Three.js 相机只由 Drei `CameraControls` 管理；Motion 只管理 DOM 与 Canvas 容器布局；GSAP 只管理节点工作室的导演式时间线。
- 节点视觉层与拾取层分离。视觉可小、命中必须稳定。
- `hoveredNodeId` 只影响局部强调和面板内容，不重建整个图谱。
- 神经信号层不读取 `hoveredNodeId`、`ScenePresence` 或鼠标状态。
- 自定义知识树数据使用稳定 node/edge id；不得持久化 Mesh、instanceId 或临时指针。
- 所有新增/移动/连线必须先在 draft 中完成，最后一次原子提交到 `libraryStore`。
- Windows 设备不得通过删掉语义节点换性能；降级顺序只能是 bloom、DPR、信号数量/帧率、曲线段数、标签数量。

## 3. 路由与场景架构

### 3.1 路由结构

`AppRouter` 调整为：

- `SpatialExperienceShell`
  - `/` → `LandingPage`（仅 DOM 文案与 CTA）
  - `/universe` → `UniversePage`（仅 DOM 工具与详情）
- `AppShell`
  - `/teach/*`
  - `/practice/*`
  - `/library/*`
  - `/progress`

`SpatialExperienceShell` 持久挂载：

- `KnowledgeFieldCanvas`
- `SpatialCameraDirector`
- `SpatialExperienceContext`
- 宇宙页才显示的 `GlobalNav`、`MobileNav`、`GlobalSearch`
- `<Outlet />`

离开空间相关路由时才卸载 Three.js，保证教学、刷题、普通知识库页面不承担 WebGL 成本。

### 3.2 入场状态机

状态固定为：

`landingTopDown → entering → universeOverview → free`

时序：

- 0ms：CTA 锁定；开屏文案开始退场；Canvas 容器从右侧预览窗向全屏扩张。
- 80ms：CameraControls 从俯视位置开始 `setLookAt(..., true)` 到斜视全景。
- 420ms：导航到 `/universe`；Canvas 和相机不卸载。
- 560ms：宇宙工具栏淡入；仍不抢镜头控制。
- 980ms：自动镜头结束，状态进入 `free`，开放旋转/缩放/平移。

若用户开启减少动态：取消镜头轨迹，只做 160ms 淡入并直接落在斜视全景。

## 4. 节点、连线与交互

### 4.1 节点双层渲染

`NodePointField` 只负责光点视觉；新增 `NodeHitField`：

- 单个透明 `InstancedMesh` 球体承载全部节点命中代理。
- 每个实例由稳定数组 `instanceIndexToNodeId` 映射。
- 命中球使用屏幕尺寸补偿：远处仍保持约 14–20px 可点区域。
- `pointerdown` 记录 nodeId 与屏幕坐标；`pointerup` 位移小于 7px 且 nodeId 相同才算 click。
- 拖动相机时不选择节点；点击节点时停止向后方对象传播。
- CameraControls 运动时调用 R3F `events.update()`，让静止鼠标下的 hover 与镜头保持同步。

### 4.2 神经信号

`NeuralSignals` 改为常驻层：

- 视觉质量档 18 个、均衡档 12 个、性能档 6 个信号。
- 所有信号合并在一个 `THREE.Points` 中。
- 每个信号保存 curve、phase、speed、color；帧内只更新同一块 positions buffer。
- 自己调度 `invalidate()`：质量 40fps、均衡 26fps、性能 14fps。
- 页面隐藏时暂停；减少动态时停止移动但保留静态方向提示。
- hover/选择只改变相关链路的亮度和速度权重，不控制信号是否存在。

### 4.3 右侧面板

删除 `NodePeek` 与 `InspectorContent` 两个外壳互换的结构，改成永久挂载的 `NodeInspectorShell`：

- `displayNodeId = selectedNodeId ?? hoveredNodeId`
- `mode = hidden | peek | pinned`
- 根 `motion.aside` 永不因 peek/pinned 切换而换 key。
- 根节点使用 `layout` 平滑改变宽高；标题、颜色点和类型标签保持同一 DOM。
- 详情内容在外壳内部展开，使用 `AnimatePresence mode="popLayout"`。
- hover 增加 70ms 稳定延迟；快速穿过密集节点不反复闪烁。
- pointerout 只在未选中节点时收起；点击后锁定；Escape 回到当前 hover 或 hidden。

## 5. 自定义知识树产品闭环

### 5.1 数据模型

`CustomNode` 扩展为真正三维属性图节点：

- `position: [x, y, z]`
- `kind`、`layer`、`domain`、`color`
- `name`、`summary`、`content`
- `learningObjectives`、`misconceptions`、`recommendedContent`
- `difficulty`、`estimatedMinutes`、`tags`
- `parentId`（便捷索引，正式关系仍以 edge 为准）

`CustomEdge` 保留 `source`、`target`、`relationType`，并增加可选 `reason` 与 `strength`。关系类型固定为层级、前置、相关、练习对应。

### 5.2 创建顺序

知识库新建路由第一次进入时不直接显示五步后台式表单，而是：

1. `CreateTreePrelude`：名称、领域、描述，创建根节点。
2. `CustomTreeWorkspace`：进入该知识库独立的三维树，默认只有根节点。
3. 点击“添加节点”进入 `NodeCreationDirector`。
4. 完成节点后回到同一三维树，节点保持选中。
5. 教学、题目、发布作为树级工具，不再与添加节点混为一条强制五步流程。

### 5.3 节点创建状态机

`treeIdle → apertureOpening → cardMaterializing → contentEditing → nodeCondensing → spatialEditing → placing → connecting → committed`

具体布局：

- 桌面端左侧 58%：三维树与知识卡片共享舞台。
- 右侧 42%：属性控制区，宽度 420–520px。
- 内容编辑阶段：卡片占左侧视觉中心，三维树退到深景但不消失。
- 空间编辑阶段：卡片从边缘向中心收束为发光节点，右侧表单从内容字段形变为层级、父子、颜色、位置、关系字段。
- 节点落树阶段：CameraControls 暂时锁定；用户拖动节点；关系草线跟随鼠标；完成或取消后恢复镜头控制。

### 5.4 乡村小栈可复用模式

直接借鉴的是对象身份连续性，而不是电商内容：

- `SharedObjectLayer` → `CustomTreeObjectLayer`：卡片从创建、编辑到节点落树始终是同一身份。
- `productPresentationPhase` → `nodeCreationPhase`：视觉不直接由路由决定，而由显式阶段决定。
- `focusProduct` → `focusDraftNode`：选中对象聚焦，其他对象退让但不删除。
- `ProductCardVisual` → `KnowledgeIdentityCard`：同一组件随阶段持续增加内容，不创建第二张摘要卡。
- `restoreFocusFromCheckout` → `restoreNodeContentEditing`：返回时先收起空间属性，再让节点还原成卡片。
- `confirmPurchaseCard` → `commitNodeToTree`：提交时一次锁定反馈，随后凝聚落树。

不复制商品、订单、付款、信封等业务；不复制固定 setTimeout；不让多个动画库同时写同一 transform。

## 6. 组件与文件施工清单

新增：

- `src/features/spatial/SpatialExperienceShell.tsx`
- `src/features/spatial/SpatialExperienceContext.ts`
- `src/scene/SpatialCameraDirector.tsx`
- `src/scene/NodeHitField.tsx`
- `src/scene/SignalClock.tsx`
- `src/features/library-builder/components/CreateTreePrelude.tsx`
- `src/features/library-builder/components/CustomTreeCanvas.tsx`
- `src/features/library-builder/components/CustomTreeScene.tsx`
- `src/features/library-builder/components/CustomTreeNodeLayer.tsx`
- `src/features/library-builder/components/NodeCreationDirector.tsx`
- `src/features/library-builder/components/KnowledgeIdentityCard.tsx`
- `src/features/library-builder/components/NodeSpatialInspector.tsx`
- `src/features/library-builder/components/ConnectionDraftLayer.tsx`
- `src/graph/customTreeLayout.ts`
- `src/graph/customGraphValidation.ts`

重构：

- `src/app/AppRouter.tsx`：建立共享空间父路由。
- `src/features/landing/pages/LandingPage.tsx`：删除独立 2D 预览，只保留空间覆盖层。
- `src/features/landing/components/KnowledgeGraphPreview.tsx`：停止使用并删除。
- `src/features/universe/pages/UniversePage.tsx`：移除 Canvas，只保留 DOM 交互。
- `src/scene/UniverseCanvas.tsx`：支持共享 shell、场景模式和常驻信号。
- `src/scene/CameraController.tsx`：拆分相机导演与普通意图适配。
- `src/scene/NodePointField.tsx`：只渲染视觉，不承担点击。
- `src/scene/NeuralSignals.tsx`：与 ScenePresence 解耦。
- `src/components/NodeInspector.tsx`：合并为单一永久外壳。
- `src/features/library-builder/pages/LibraryBuilderPage.tsx`：改为树优先工作台。
- `src/features/library-builder/components/GraphEditorStep.tsx`：二维 SVG 编辑器退出主流程。
- `src/features/library-builder/components/NodeAtelier.tsx`：拆分为内容定制与空间定制两段。
- `src/store/libraryStore.ts`：三维坐标、原子命令与草稿状态。
- `src/services/content/ContentRepository.ts`：按三维坐标映射自定义节点。

## 7. 性能与验收

### 7.1 性能

- R3F Canvas 使用 `frameloop="demand"`；只有镜头、生命动画、神经信号运行时主动 invalidation。
- 节点视觉一个 draw call，拾取代理一个 draw call，边按视觉状态批处理。
- Windows 默认均衡档；运行 2 秒后由 PerformanceMonitor 修正。
- bloom 只在稳定高帧率时启用。
- 页面隐藏立即停止信号调度。
- 自定义树编辑阶段节点量较少，用独立 Mesh；发布总览再实例化。

### 7.2 必测流程

1. 开屏同树俯视 → 点击 → 同一节点位置连续转斜视，无黑帧、无图谱替换。
2. 鼠标静止时镜头经过节点，右侧仍更新名称。
3. 随机抽取全部 336 个节点中心投影，逐一点击均得到正确 nodeId。
4. hover 面板点击后同一外壳展开，根节点不卸载。
5. 神经信号在 hover、点击、拖镜头、空闲四种状态都持续。
6. 新建知识库先得到单根三维树；添加节点时光口/卡片/凝聚/落树连续。
7. 节点可拖动、可连接、可返回上一步并恢复卡片形态。
8. 刷新后树、节点、三维位置、关系、教学内容全部恢复。
9. Windows Chrome/Edge 1366×768 与 1920×1080，连续操作 3 分钟无明显卡顿。
10. 390、768、1440 三档视口完成核心闭环。

完成标准：类型检查、单测、生产构建和 E2E 全部通过，浏览器控制台无未处理异常，且上述十条均有自动化或截图/轨迹证据。
