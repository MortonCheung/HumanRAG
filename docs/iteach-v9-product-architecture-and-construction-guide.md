# iTeach V9 产品架构与施工执行指南

> 文档性质：可直接交给执行 Agent 的施工图纸，不是灵感提案，也不是提示词。  
> 项目路径：`/Users/morton_cheung/Desktop/AI/iTeach`  
> 编写基线：2026-09-01 当前工作区。  
> 本轮范围：产品层级、开屏与 Universe、知识库管理、单知识树使用与编辑、知识树和知识点创建、统一教学与题库入口、动画连续性、Windows 性能。  
> 施工原则：保留现有可用能力，修正共享根因，不另起一套平行系统。

---

## 0. 给执行 Agent 的最终结论

### 0.1 一句话产品定义

iTeach 是一款由知识结构组织学习范围的大学刷题与定向教学产品。三维知识空间负责帮助用户理解知识之间的关系，题库和教学工作区才是最终使用闭环。

### 0.2 固定产品层级

以后所有页面、路由、数据和文案都必须使用下面三个层级，不得混用：

```text
知识库 Knowledge Library
  例：计算机科学
  作用：存放一个专业或领域的全部内容

  └─ 知识树 Knowledge Tree
       例：前端开发、后端开发、AI 工程、计算机硬件、考研 408
       作用：组织一个专业中的具体方向

       └─ 知识点 Knowledge Point
            例：TCP、HTTP、链表、进程调度
            作用：最小教学、出题、掌握度和错因归属单位
```

当前版本只做“计算机科学”一个知识库。以后增加医学、法律或艺术知识库时，只新增目录数据和内容，不复制页面，不复制工作区。

### 0.3 产品主闭环

```text
知识空间或知识库
  → 选择知识树
  → 选择知识点或整棵树
  → 学习 / 刷题
  → 作答证据回写到知识点
  → 掌握度和错因更新
  → 回到原来的知识树或知识空间
```

题目与教学内容只保存一份，并且绑定知识点。所谓“知识树题库”和“知识库综合题库”只是查询范围扩大，不允许复制一份大题库数据。

### 0.4 本轮设计读法

Reading this as：面向 iTeach 比赛评委和大学生的产品重设计，信息架构采用 Apple 式职责分离和稳定导航，视觉采用 Claude、Kimi、Moonshot 的克制编辑感与 NVIDIA 的技术精度，空间转场采用 Awwwards 式有动机的连续动画。

设计参数固定为：

- `DESIGN_VARIANCE: 7`：构图允许不对称，但控件位置稳定。
- `MOTION_INTENSITY: 7`：关键对象和页面有导演式连续动画，普通控件保持克制。
- `VISUAL_DENSITY: 3`：一次只让用户处理一件事，拒绝卡片墙和按钮墙。

### 0.5 最高施工规则

1. 一个页面只负责一个任务。
2. 一个区域最多一个主按钮。
3. 导航只负责“去哪里”，操作按钮只负责“做什么”。
4. 相同内容从不同入口进入时，必须落到同一个页面组件。
5. 动画必须表现对象从哪里来、如何变化、到哪里去。
6. 删除优先于新增，复用优先于重写。
7. 不为“未来可能需要”提前搭建第二套后端、编辑器或题库。
8. 不删除数据校验、错误提示、持久化、无障碍和性能保护。

本轮文档优先级高于 V7、V8 中与新产品层级冲突的章节。V8 的共享 Canvas、持续信号、全节点拾取和节点卡片连续性继续保留。

---

# 1. 今天所有需求的统一整理

## 1.1 开屏与 Universe

当前问题：

- 开屏沿用持久化的“前端工程师”或其他已选目标，进入 Universe 后仍保持错误高亮。
- 开屏没有完整展示整棵树，镜头不够远。
- 开屏信息太多，有多个按钮、统计、说明和伪导航。
- 导航栏出现过早，削弱从开屏进入产品的仪式感。
- 选择一棵树后其他树仍堆在屏幕里，光点太密集。
- 每次选择节点，连接线会重新播放一次出现动画。
- 底部因果控制台和右侧面板功能重叠。

期望行为：

- 每次打开开屏，使用临时随机种子点亮 2-3 条短链路，营造全局知识网络已有生命的感觉。
- 随机高亮只属于开屏展示，不写入用户状态，不代表真实选择。
- 开屏只显示同一棵三维知识图谱、左上角 iTeach 标识和一个“进入知识空间”按钮。
- 点击进入时，先清除临时高亮和上一次节点、关系模式、目标聚焦，再开始镜头运动。
- 相机从更远的俯视全景连续倾斜、摆正并拉近到正常三维斜视位置。
- 导航栏在镜头运动过半后从顶部自然展开。
- 用户选择某棵知识树时，其他树平滑移动到视野外，不能删除，也不能堆成暗点背景。
- 连接线拓扑保持稳定，选择节点只更新亮度和状态，不重新绘制入场动画。
- 神经信号始终沿线流动，不受鼠标悬停影响。
- 所有节点都可以悬停和点击，拖动镜头时不会误触。

终止条件：开屏点击进入后不再残留任何开屏高亮；正式视角可自由旋转、平移、缩放；切换树和节点时无整图闪烁。

## 1.2 节点交互与右侧面板

当前问题：

- hover 名称到 click 详情虽然已有同一 `motion.aside`，内部正文仍有“旧内容消失、新内容出现”的割裂感。
- 底部 `CausalCorridorDock` 重复承载上游、下游、路径等功能。
- 学习和刷题按钮出现在所有层级节点上，范围不清楚。

期望行为：

- 鼠标放在任意节点上，右侧固定锚点先显示节点名称和类型。
- 点击后，同一个面板、同一个标题、同一个色点在原地长高和展开，不替换面板身份。
- 面板中的上游、下游、主路径、全部关系和生成学习路径合并为一个“关系”区域。
- 删除屏幕底部重复面板。
- 只有具体知识点才显示“学习这个知识点”和“练习这个知识点”。
- 方向、课程、技能等中间节点只显示关系、概览和“进入所属知识树”。
- 关闭详情后，若鼠标仍停在节点上，面板回到 hover 名称状态；否则收起。

## 1.3 全局导航与功能入口

当前问题：顶部同时出现“教学”“刷题”“知识库”，功能入口重复，用户不知道自己在学什么或刷什么。

最终导航固定为：

- 知识空间
- 知识库
- 搜索
- 学习记录
- 个人入口或设置

明确删除：

- 全局“教学”导航。
- 全局“刷题”导航。
- `/teach` 教学首页。
- `/practice` 刷题首页。

学习和刷题只有两类入口：

1. Universe 点击具体知识点，在右侧面板进入该知识点学习或题库。
2. 知识库 → 知识树 → 学习或题库，也可以从知识库进入综合题库。

无论从哪条路径进入同一个知识点，都必须复用同一个 `LearningWorkspace` 或 `PracticeWorkspace`。

## 1.4 知识库总管理页

当前问题：

- “主知识库”概念没有意义。
- 左侧将三维树压成二维缩略图，结构凌乱。
- 右侧列表点击后直接跳转，缺少预览和确认。
- “按课程导入”混入管理页，不知道页面到底在管理、导入还是预览。
- 创建、打开、导入等按钮散落。

期望职责：`/library` 只负责“管理当前知识库中的知识树”。

页面分成三个明确区域：

1. 预览区：展示当前选中的一棵独立三维知识树，固定相机，缓慢自动旋转，像展示台上的精致模型。
2. 管理区：列出计算机知识库中的所有知识树，点击列表只切换预览，不直接进入。
3. 操作区：集中放置“进入知识树”“创建知识树”“综合题库”三个动作。

删除：

- “当前主知识库”文案和组件。
- 二维 `LibraryGraphThumbnail`。
- `UniversityTemplateRail` 在管理页中的展示。
- 列表行直接跳转。
- 页面中所有与管理知识树无关的导入、教学覆盖和来源功能。

## 1.5 单知识树页面

默认状态必须是“使用”，只有用户点击“编辑”后才加载编辑工具。

使用状态分成三个本地页面，不在一个页面堆满：

- 总览：理解这棵树、查看三维模型与只读结构、继续上次学习。
- 学习：按知识点或推荐顺序进入教学。
- 题库：选择整树范围或具体知识点开始刷题。

本地导航只在单知识树范围内显示“总览 / 学习 / 题库”。“编辑”是右侧操作按钮，不是第四个混杂标签。

系统知识树默认只读，按钮显示“复制后编辑”；用户知识树按钮显示“编辑”。

## 1.6 创建知识树

当前问题：创建知识库与创建节点混在五步流程中，必须先有节点才能发布，还混合资料、教学、题目、预览。

期望行为：

- 新建的是“知识树”，不是新的专业知识库。
- 所有字段都可以留空，系统允许用户还没想好。
- 名称留空时自动生成“未命名知识树 01”“未命名知识树 02”。
- 同一知识库内不能创建两个规范化后相同的知识树名称。
- 创建知识树时不自动创建根节点。
- 左侧初始是有设计的“空无”空间，不露出浏览器底色。
- 提交后以“空间诞生”的方式形成一棵空知识树，然后进入结构编辑页。
- 空树页面只有一个主要动作：“添加第一个知识点”。
- 资料导入以后可以是独立入口，本轮不要放回创建页或管理页。

## 1.7 创建知识点

节点创建固定为两个连续阶段：

1. 编辑节点自身。
2. 把节点放入知识树并建立环境关系。

第一阶段：

- 左侧是被顶部光束照亮的知识卡片。
- 右侧是一个完整但清楚的单页表单，不使用标签页。
- 填写名称、类别、颜色、概念说明、教学正文、学习目标、常见误区、标签、难度、预计时长、推荐内容。
- 卡片随输入实时书写，像定制高价值商品，但文案保持正常、直接。

第二阶段：

- 同一张卡片保持身份，材质和边缘逐渐收束为对应颜色的发光节点。
- 背后的独立三维知识树从黑暗中显现。
- 右侧表单变成层级、父节点、子节点、前置知识、相关知识和位置。
- 用户可以在左侧直接拖动节点，选择连接目标。
- 点击“加入知识树”后一次性提交节点、位置和关系。

禁止：

- 卡片突然消失后创建一个新圆点。
- 只做简单 `scale: 0.05` 的缩小。
- 在弹窗里放四个标签页。
- 内容和空间关系在同一屏同时要求完成。

## 1.8 产品定位

iTeach 不是一个只供用户自行浏览的 Study 工具。教学闭环必须保留：

```text
目标说明 → 前置诊断 → 概念讲解 → 教师示范
→ 引导练习 → 独立检查 → 错因复教 → 再次检测 → 结果回写
```

产品主要入口仍是刷题，但错题能够进入对应知识点教学，教学结束也能返回对应知识点题库。

---

# 2. 当前工程审计与复用清单

## 2.1 必须保留的已有能力

| 能力 | 现有文件 | 处理方式 |
|---|---|---|
| 开屏与 Universe 共享 Canvas | `src/features/spatial/SpatialExperienceShell.tsx` | 保留父结构，修正初始化和导航时序 |
| 相机连续移动 | `src/scene/CameraController.tsx` | 保留 `CameraControls`，扩大开屏视野并增加明确状态 |
| 全节点视觉批处理 | `src/scene/NodePointField.tsx` | 保留，增加知识树位移 uniform |
| 全节点拾取 | `src/scene/NodeHitField.tsx` | 保留，跟随树位移更新命中代理 |
| 曲线连接线 | `src/scene/BatchedKnowledgeEdges.tsx` | 保留 shader 思路，拆开一次入场和选择状态 |
| 持续神经信号 | `src/scene/NeuralSignals.tsx` | 保留，继续与 hover 解耦 |
| 空闲生命感 | `src/scene/ScenePresenceController.tsx` | 保留，用户操作时归位并停止无关变形 |
| hover 到 click 同一面板 | `src/components/NodeInspector.tsx` | 保留根节点身份，合并底部关系工具 |
| 教学 8 步状态机 | `src/store/teachingStore.ts` | 保留，改成共享工作区外壳 |
| 题目作答与回写 | `src/store/practiceStore.ts` | 保留，改用范围 Scope 启动 |
| 统一内容仓库雏形 | `src/services/content/ContentRepository.ts` | 扩展查询知识库、树、知识点范围 |
| 三维个人树编辑 | `src/features/library-builder/components/CustomTreeCanvas.tsx` | 提取为通用知识树 Canvas |
| 拖动、连接和布局 | `GraphEditorStep.tsx`、`customTreeLayout.ts` | 保留核心交互，移入结构编辑页 |
| 节点卡片与光束 | `NodeAtelier.tsx` | 拆成持续父壳中的两个页面 |
| 本地持久化 | `src/services/persistence/demoPersistence.ts` | 保留并增加 V9 迁移 |
| 自适应质量策略 | `src/performance/qualityPolicy.ts` | 保留并补充 Windows 验收 |

## 2.2 必须删除或停止使用的组件

完成新页面并通过测试后，再删除以下旧入口：

- `src/features/teaching/pages/TeachingHomePage.tsx`
- `src/features/practice/pages/PracticeHomePage.tsx`
- `src/features/library/components/PrimaryLibrary.tsx`
- `src/features/library/components/LibraryGraphThumbnail.tsx`
- `src/features/library/components/UniversityTemplateRail.tsx`
- `src/components/CausalCorridorDock.tsx`
- 旧五步创建器中的 `TeachingSchemaStep.tsx`
- 旧五步创建器中的 `QuestionGenerationStep.tsx`
- 旧五步创建器中的 `PublishPreviewStep.tsx`

不要在第一批次直接删除。先把引用迁移到新组件，确认 `rg` 无引用后再删除。

## 2.3 需要重构但不能重写的文件

- `src/app/AppRouter.tsx`
- `src/app/routes.ts`
- `src/components/navigation/GlobalNav.tsx`
- `src/components/navigation/MobileNav.tsx`
- `src/features/landing/pages/LandingPage.tsx`
- `src/features/spatial/SpatialExperienceShell.tsx`
- `src/store/knowledgeStore.ts`
- `src/graph/relevance.ts`
- `src/scene/BatchedKnowledgeEdges.tsx`
- `src/components/NodeInspector.tsx`
- `src/features/library/pages/LibraryHomePage.tsx`
- `src/features/library/pages/LibraryDetailPage.tsx`
- `src/features/library-builder/pages/LibraryBuilderPage.tsx`
- `src/store/libraryStore.ts`
- `src/services/content/ContentRepository.ts`

## 2.4 Ponytail 在本项目中的实际用法

`iTeach-design-references/ponytail` 只作为执行规则和审查参考，不加入浏览器运行包。

每个需求按下面顺序判断：

1. 不需要存在吗？例如独立教学首页、独立刷题首页、主知识库、底部控制台，删除。
2. 已有能力吗？例如教学状态机、题目回写、三维树、拾取层，复用。
3. 浏览器或 React Router 能解决吗？例如返回来源使用 history state，不新增导航框架。
4. 已安装依赖能解决吗？Motion 负责 DOM 共享对象，GSAP 只负责导演式创建时间线，Three.js 负责空间。
5. 只新增满足验收的最小领域层和页面壳。

## 2.5 本地参考资源的使用边界

执行 Agent 在开始视觉施工前必须先读：

- `/Users/morton_cheung/Desktop/AI/iTeach/iTeach-design-references/README.md`
- `/Users/morton_cheung/Desktop/AI/iTeach/docs/REFERENCE_MANIFEST.md`
- `/Users/morton_cheung/Desktop/AI/iTeach/乡村小栈/src/pages/CheckoutPage.jsx`
- `/Users/morton_cheung/Desktop/AI/iTeach/乡村小栈/src/app/sceneTransition.js`
- `/Users/morton_cheung/Desktop/AI/iTeach/乡村小栈/src/styles/scene.css`

这些资源的用途固定如下：

| 资源 | 本项目可复用内容 | 禁止行为 |
|---|---|---|
| `taste-skill` | 反模板审计、密度、排版、颜色和动效约束 | 不复制一个通用落地页 |
| `impeccable` | 交互状态、精修清单、无障碍审查 | 不引入第二套 UI 风格 |
| `ui-ux-pro-max-skill` | 响应式、表单和产品页面模式参考 | 不直接覆盖现有 token |
| `awesome-design-md` | 设计原则和案例索引 | 不把链接清单当运行依赖 |
| `GSAP`、`gsap-skills` | 知识树诞生、卡片凝聚、镜头配合的导演式时间线 | 不让 GSAP 接管普通按钮和所有页面 |
| `motion` | DOM 布局变化、共享外壳、hover 到 click 展开 | 不与 GSAP 同时写同一 transform |
| `anime` | 仅在现有 Motion/GSAP 都不适合的独立装饰序列中使用 | 本轮默认不新增使用点 |
| `lottie-web` | 继续用于已经存在的掌握完成反馈 | 不把 Lottie 当页面转场 |
| `inspira-ui` | 只提取视觉机制和源码思路 | 它以 Vue 为主，不直接装入 React 运行时 |
| `os-taxonomy` | 学习 taxonomy、schema 和可扩展目录方法 | 不复制小学内容和视觉皮肤 |
| `ponytail` | 删除、复用、最小正确实现的施工纪律 | 不加入浏览器 bundle |

乡村小栈只复用“唯一对象在多个页面之间持续存在”的机制：

- `SharedObjectLayer` 的唯一视觉对象原则，应用到 `KnowledgeIdentityObject`。
- `checkout-purchase-anchor` 的透明定位锚点，应用到内容页和放置页的对象定位。
- `restoreFocusFromCheckout` 的可逆返回，应用到放置页返回内容页。
- `confirmPurchaseCard` 的一次性确认反馈，应用到 `commitPointBundle`。
- `checkoutPhase` 显式状态机，应用到 `PointCreationShell`。

不得复制商品、价格、订单、付款、信封等业务，也不得照抄乡村小栈的可见文案。

网站风格参考只转化为原则：

- Apple：页面职责、返回路径、编辑和使用态分离。
- Claude、Kimi、Moonshot：安静的深色表面、清楚的中文、少按钮、留白。
- NVIDIA：三维技术内容具有准确的层级和性能意识。
- Awwwards：关键转场有空间叙事和对象连续性，但不牺牲可用性。
- Foldcraft 和海洋案例：只借鉴暗场、顶部光口、单一被照亮对象与克制入场，不依赖缺失的视频素材。

---

# 3. 最终信息架构与路由

## 3.1 全局导航

桌面端从左到右：

```text
iTeach | 知识空间 | 知识库                       搜索 | 学习记录 | 个人入口
```

移动端：品牌、搜索、菜单。菜单内只出现“知识空间、知识库、学习记录、设置”。

开屏 `/` 不渲染全局导航。

## 3.2 最终路由表

```text
/
  开屏，只显示共享三维树和进入按钮

/universe
  三维知识空间

/library
  当前知识库的知识树总管理页

/library/:libraryId/practice
  知识库综合题库入口与会话

/library/:libraryId/trees/new
  创建知识树

/library/:libraryId/tree/:treeId
  单知识树总览，默认使用状态

/library/:libraryId/tree/:treeId/learn
  单知识树学习范围页

/library/:libraryId/tree/:treeId/practice
  单知识树题库范围页

/library/:libraryId/tree/:treeId/point/:pointId/learn
  具体知识点教学工作区

/library/:libraryId/tree/:treeId/point/:pointId/practice
  具体知识点题库工作区

/library/:libraryId/tree/:treeId/edit/structure
  编辑知识树空间结构和关系

/library/:libraryId/tree/:treeId/edit/content
  管理知识点内容

/library/:libraryId/tree/:treeId/edit/questions
  管理知识点题目

/library/:libraryId/tree/:treeId/edit/settings
  编辑知识树自身信息

/library/:libraryId/tree/:treeId/points/new/content
  新知识点自身内容

/library/:libraryId/tree/:treeId/points/new/place
  新知识点位置与关系

/progress
  学习记录
```

旧路由处理：

- `/teach` 重定向到 `/library`。
- `/practice` 重定向到 `/library`。
- `/teach/:unitId` 在能解析 `nodeId` 时重定向到对应知识点学习路由。
- `/practice/session/:sessionId` 保留一个版本作为兼容跳转，解析 Scope 后进入新路由。
- `/library/new` 重定向到 `/library/computer/trees/new`。
- `/library/:oldId/edit` 通过适配器重定向到对应知识树结构编辑页。
- `/library/:oldId` 将现有系统分支 ID 识别为 `treeId`，重定向到计算机知识库中的单树页。

## 3.3 路由常量关键代码

在 `src/app/routes.ts` 中集中定义，不允许页面手写路径字符串：

```ts
export const ROUTES = {
  root: '/',
  universe: '/universe',
  library: '/library',
  libraryHome: (libraryId: string) => `/library/${libraryId}`,
  libraryPractice: (libraryId: string) => `/library/${libraryId}/practice`,
  treeNew: (libraryId: string) => `/library/${libraryId}/trees/new`,
  tree: (libraryId: string, treeId: string) =>
    `/library/${libraryId}/tree/${treeId}`,
  treeLearn: (libraryId: string, treeId: string) =>
    `/library/${libraryId}/tree/${treeId}/learn`,
  treePractice: (libraryId: string, treeId: string) =>
    `/library/${libraryId}/tree/${treeId}/practice`,
  pointLearn: (libraryId: string, treeId: string, pointId: string) =>
    `/library/${libraryId}/tree/${treeId}/point/${pointId}/learn`,
  pointPractice: (libraryId: string, treeId: string, pointId: string) =>
    `/library/${libraryId}/tree/${treeId}/point/${pointId}/practice`,
  treeEdit: (libraryId: string, treeId: string, section = 'structure') =>
    `/library/${libraryId}/tree/${treeId}/edit/${section}`,
  pointNewContent: (libraryId: string, treeId: string) =>
    `/library/${libraryId}/tree/${treeId}/points/new/content`,
  pointNewPlace: (libraryId: string, treeId: string) =>
    `/library/${libraryId}/tree/${treeId}/points/new/place`,
  progress: '/progress',
} as const;
```

## 3.4 来源与返回规则

同一个工作区只因来源不同而改变返回按钮，不改变页面主体。

定义：

```ts
export type WorkspaceOrigin =
  | { kind: 'universe'; nodeId: string }
  | { kind: 'tree'; libraryId: string; treeId: string }
  | { kind: 'library'; libraryId: string };
```

进入工作区时使用 React Router `state` 保存来源。刷新丢失 state 时，根据 URL 回退到知识树页面。禁止通过复制 `UniverseLearningPage` 和 `LibraryLearningPage` 解决返回问题。

---

# 4. V9 领域模型与数据迁移

## 4.1 新增领域目录

新增：

```text
src/domain/knowledge/
  types.ts
  catalog.ts
  selectors.ts
  adapters.ts
  scope.ts
  migration.ts
```

职责：

- `types.ts`：三层领域类型和 Scope。
- `catalog.ts`：当前计算机知识库与系统知识树目录。
- `selectors.ts`：按库、树、知识点查询，不依赖 React。
- `adapters.ts`：把现有 `KnowledgeNode`、`UserLibrary` 适配到 V9。
- `scope.ts`：聚合题目和教学内容。
- `migration.ts`：读取旧持久化数据并转换。

## 4.2 最小领域类型

```ts
export interface KnowledgeLibrary {
  id: string;
  name: string;
  description: string;
  domain: string;
  treeIds: string[];
}

export interface KnowledgeTree {
  id: string;
  libraryId: string;
  name: string;
  description: string;
  color: string;
  ownerType: 'system' | 'user';
  pointIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgePoint {
  id: string;
  name: string;
  kind: 'course' | 'skill' | 'knowledge' | 'practice';
  description: string;
  content: string;
  color: string;
  position: [number, number, number];
  difficulty?: '基础' | '进阶' | '挑战';
  estimatedMinutes?: number;
  tags: string[];
  learningObjectives: string[];
  misconceptions: string[];
  recommendedContent: string[];
}

export interface TreeMembership {
  treeId: string;
  pointId: string;
  role: 'root' | 'branch' | 'leaf';
  order?: number;
}

export interface KnowledgeRelation {
  id: string;
  sourcePointId: string;
  targetPointId: string;
  type: 'hierarchy' | 'prerequisite' | 'related' | 'practice_for';
}

export type LearningScope =
  | { kind: 'library'; libraryId: string }
  | { kind: 'tree'; libraryId: string; treeId: string }
  | { kind: 'point'; libraryId: string; treeId: string; pointId: string };
```

重要：同一个知识点允许通过多个 `TreeMembership` 出现在不同知识树中。例如 HTTP 可以属于前端树和网络树，但知识点、题目和教学内容仍只保存一份。

## 4.3 现有数据的最小迁移

不要一次性重写 336 节点数据。

1. 新建 `computer` 知识库。
2. 把当前 `branchId` 的 `408`、`ai`、`game`、`frontend` 适配为四棵系统知识树。
3. 保留现有节点 ID，初期将 `nodeId` 直接作为 `pointId`。
4. 保留现有边 ID，适配字段名。
5. 现有 `UserLibrary` 在迁移层视为用户 `KnowledgeTree`，不立刻更改 localStorage 中全部字段。
6. 写入时使用 V9 版本号，读取时兼容 V7/V8。

可以在 `libraryStore.ts` 暂时保留兼容别名：

```ts
/** @deprecated V9 UI 中称为 KnowledgeTree */
export type UserLibrary = UserKnowledgeTree;
```

只有在所有调用点迁移完成后才删除旧名。不要为了命名纯洁度先重写整个 Store。

## 4.4 名称规则

新增：

```ts
export function normalizeTreeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
}
```

创建知识树时：

- 空名称生成下一个未占用的“未命名知识树 01”。
- 非空名称与同知识库中已有名称比较规范化值。
- 重名时不提交，在输入框下方显示：“这个知识库中已经有同名知识树。”
- 不使用 `window.alert()`。

## 4.5 内容聚合规则

扩展 `ContentRepository`：

```ts
interface ContentRepository {
  getKnowledgeLibrary(id: string): KnowledgeLibrary | undefined;
  getKnowledgeTree(id: string): KnowledgeTree | undefined;
  getKnowledgePoint(id: string): KnowledgePoint | undefined;
  getPointsForTree(treeId: string): KnowledgePoint[];
  getQuestionsForPoint(pointId: string): Question[];
  getQuestionsForTree(treeId: string): Question[];
  getQuestionsForLibrary(libraryId: string): Question[];
  getTeachingUnitForPoint(pointId: string): TeachingUnit | undefined;
}
```

树题库实现必须是：

```ts
const ids = new Set(getPointsForTree(treeId).map((point) => point.id));
return allQuestions.filter((question) =>
  question.nodeIds.some((pointId) => ids.has(pointId)),
);
```

知识库综合题库是该库所有树的知识点并集。必须用 `Set` 去重，禁止复制题目。

---

# 5. 开屏与 Universe 施工图

## 5.1 开屏最终布局

文件：`src/features/landing/pages/LandingPage.tsx`

桌面：

- 同一 WebGL Canvas 全屏铺底。
- 左上角距安全区 32-48px：只显示 `iTeach`，不显示“AI 教学系统”、节点数量或方向数量。
- 屏幕底部中间距底部安全区 38-56px：唯一按钮“进入知识空间”。
- 不显示大标题、长段落、第二按钮、图谱说明、当前内容统计。
- 按钮宽 176-210px，高 48-52px，浅灰白底、深色字，8px 圆角。

移动端：

- 品牌距左上 20px。
- 按钮固定在底部安全区上方 20px，左右各 20px，宽度占满。
- 不增加说明文案。

`LandingPage` 只订阅 `phase` 和 `beginUniverseEntry`。删除对 `knowledgeGraph.nodes.length`、`ROUTES.library`、`ROUTES.practice` 的引用。

## 5.2 临时随机高亮

新增 `src/features/spatial/landingPreview.ts`。

要求：

- 每次新的浏览器会话生成一个 seed，保存在 `sessionStorage`。
- 从图中确定性抽取 2-3 个长度 3-6 的连续路径。
- 路径尽量来自不同知识树。
- 只生成 `landingPreviewNodeIds` 和 `landingPreviewEdgeIds`。
- 不调用 `selectGoal`、`selectNode`，不写入 `knowledgeStore` 持久化。
- 减少动态模式下保留静态高亮，不运行脉冲。

`SpatialExperienceShell` 在 `phase === 'landing'` 时把这些 ID 传给 `buildSceneModel` 的 `preview` 参数。正式 Universe 模型完全忽略它们。

## 5.3 入场前重置

在 `knowledgeStore.ts` 新增一个只清理空间临时状态的方法：

```ts
prepareUniverseEntry: () => set({
  phase: 'overview',
  selectedGoalId: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  relationMode: 'primary',
  learningPath: [],
  isPathRibbonOpen: false,
  activePanel: null,
  unmatchedGoal: false,
  cameraIntent: { id: `entry:${Date.now()}`, mode: 'overview' },
})
```

这个方法不得清除：

- 用户画像。
- 学习记录。
- 画质偏好。
- 已创建知识树。

如果产品仍希望记住用户上次目标，可以单独持久化为 `lastGoalId`，但不能在开屏或 Universe 初始视图自动点亮。

## 5.4 入场状态机

在 `SpatialExperienceContext` 中将 phase 扩展为：

```text
landing → resetting → entering → navRevealing → universe
```

正常动态时序：

| 时间 | 行为 |
|---:|---|
| 0ms | 锁定进入按钮，执行 `prepareUniverseEntry` |
| 0-180ms | 开屏随机链路亮度自然衰减到默认状态 |
| 120ms | 相机从远距俯视开始倾斜与拉近 |
| 360ms | URL 切到 `/universe`，Canvas 不卸载 |
| 620ms | 导航从顶部遮罩中向下展开 |
| 760ms | Universe 右侧工具和轻量提示淡入 |
| 1120ms | CameraControls 开放，phase 进入 `universe` |

减少动态模式：

- 先清状态。
- 160ms 交叉淡化。
- 直接设置斜视相机。
- 导航立即出现。

## 5.5 相机参数

修改 `CameraController.tsx`：

- 开屏俯视距离使用图谱包围球半径的 `2.9-3.25` 倍，完整树四周保留 12%-16% 空白。
- 开屏目标点以整个图谱中心为准，不因旧 `selectedGoalId` 偏移。
- 进入目标位置使用横向 `0.52 * distance`、竖向 `0.31 * distance`、纵深 `0.68 * distance` 的斜视构图作为起点，再通过实际截图微调。
- 正式操作的最小距离和最大距离继续保留。
- `CameraControls.enabled` 仅在 `phase === 'universe'`。
- hover 变化不得触发 `fitToBox`。

## 5.6 导航展开

`SpatialExperienceShell` 在 `navRevealing` 和 `universe` 阶段渲染同一个 `GlobalNav`。不要在 `directUniverse` 切换时突然挂载两个版本。

导航根使用：

```tsx
<motion.header
  initial={false}
  animate={navVisible
    ? { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }
    : { opacity: 0, y: -12, clipPath: 'inset(0 0 100% 0)' }}
/>
```

持续时间 420ms，缓动 `[0.16, 1, 0.3, 1]`。减少动态时只切 opacity。

---

# 6. Universe 聚焦、连线与面板

## 6.1 知识树隔离状态

新增 `activeTreeId: string | null`，来源顺序：

1. 如果选择具体知识点，取该知识点当前上下文中的 treeId。
2. 如果通过目标选择知识树，取目标匹配树。
3. 否则为 null，显示全景。

状态：

```text
overview
  所有知识树在全景位置

treeFocused
  当前树平移到场景中心并适度展开
  其他树沿各自原本的径向方向移到视锥外

pointFocused
  当前树保持在中心
  相关上下游链路点亮
```

禁止通过 `filter` 删除其他树。返回全景时必须沿原路径回来。

## 6.2 树位移动画的工程方案

新增：

```text
src/scene/BranchFocusController.ts
src/scene/branchTransforms.ts
```

`BranchFocusController` 保存每棵树的当前与目标变换：

```ts
interface BranchTransform {
  offset: THREE.Vector3;
  scale: number;
  opacity: number;
}
```

建议参数：

- 当前树：`offset → centerCorrection`、`scale → 1.08`、`opacity → 1`。
- 非当前树：沿树中心到全局中心的反方向移动 `80-120` 单位、`scale → 0.86`、`opacity → 0.06`。
- 动画 680-820ms，使用阻尼或 `[0.16, 1, 0.3, 1]`。

节点渲染、边渲染和拾取层必须读取同一个 transform registry。不能只移动视觉点而让命中球留在原位。

336 个拾取代理只在树位移过渡期间更新 instance matrix。过渡完成后停止更新，不常驻 60fps。

## 6.3 连线不再刷新

当前 `BatchedKnowledgeEdges.tsx` 的 `selectionKey` 会让 `uReveal` 每次选中节点归零。删除这个依赖。

拆成两个概念：

```ts
uIntroReveal     // 场景或树第一次出现时运行一次
uStateWeight     // 选择节点时只改变边的可见权重
uTime            // 神经信号持续流动
```

施工要求：

- 几何拓扑只在节点、边、质量档或树结构真正变化时重建。
- 点击节点只更新状态 attribute 或 uniform，不重新创建 BufferGeometry。
- `uIntroReveal` 在开屏首次加载或一棵树从屏幕外进入时执行一次。
- 同一棵树内连续点击节点时不执行 draw-on。
- active 边亮度在 220-320ms 内插值。
- `NeuralSignals` 继续独立运行，hover 不控制信号开始或停止。

## 6.4 所有节点可点击

继续使用 `NodeHitField`，补充：

- 命中半径依据相机距离保持约 16-22px 屏幕尺寸。
- `pointerdown` 后移动超过 7px视为拖动镜头，不触发点击。
- 非当前树移出屏幕后，命中代理同步移出或临时 `raycast = null`。
- CameraControls 运动时更新 hover 命中，避免鼠标不动但节点已移走仍显示旧名称。
- 暗节点也有命中代理，但屏幕外节点不能拦截点击。

## 6.5 右侧 NodeInspector

保留文件 `src/components/NodeInspector.tsx`，删除 `CausalCorridorDock` 引用。

面板固定在桌面右侧：

- top：导航下方 88px。
- right：24-32px。
- peek 宽 260-300px，高 72-82px。
- expanded 宽 360-420px，高不超过 `calc(100dvh - 112px)`。
- 移动端改为底部 sheet，peek 高 64px，展开不超过 72dvh。

DOM 结构固定：

```tsx
<motion.aside layout className="node-inspector">
  <motion.header layout="position">
    <NodeColor />
    <NodeIdentity />
    <CloseOrHint />
  </motion.header>
  <motion.div className="node-inspector__body">
    <PointActions />
    <RelationControls />
    <PathBreadcrumb />
    <ConceptSection />
    <RelatedKnowledge />
    <AiExplanation />
  </motion.div>
</motion.aside>
```

关键点：

- aside 不因 peek/pinned 改 key。
- header 不重新创建。
- 详情 body 使用 `clipPath + opacity + y` 展开，不将整个旧面板 exit。
- hover 切换名称用 45-70ms 稳定延迟。
- click 后标题保持原位置，只改变容器高度和说明信息。

## 6.6 合并关系控制

把 `CausalCorridorDock` 中的功能移到 `RelationControls`：

- 上游
- 下游
- 主路径
- 全部关系
- 生成学习路径

使用一组分段按钮或两行紧凑控件，不使用五个漂浮图标。控件只在 expanded 时出现。

删除 `ExplorerInterface.tsx` 中：

```tsx
<CausalCorridorDock model={model} />
```

## 6.7 节点动作权限

新增选择器：

```ts
function isActionablePoint(node: KnowledgeNode) {
  return node.type === 'knowledge' || node.type === 'practice';
}
```

具体知识点：显示“学习”“练习”。

中间节点：显示“进入知识树”，不显示不明确的教学和题库按钮。

Universe 跳转学习或练习时，必须带上 `libraryId=computer`、当前 `treeId` 和 `pointId`。

---

# 7. 知识库总管理页 `/library`

## 7.1 页面职责

页面只做一件事：在当前知识库中选择、预览和进入一棵知识树。

当前只有计算机知识库，所以知识库选择器显示“计算机科学”，但保留以后切换其他领域的数据接口。

## 7.2 桌面布局

文件：`src/features/library/pages/LibraryHomePage.tsx`

导航下方主容器最大宽 1540px，左右 padding 36-52px。

```text
┌──────────────────────────────────────────────────────────┐
│ 知识库                         [计算机科学 ▾]             │
│ 管理这个领域中的知识树                                      │
├───────────────────────────────┬──────────────────────────┤
│                               │ 知识树                    │
│  SelectedTreeShowcase         │ Frontend                 │
│  只展示选中的三维树             │ Backend                  │
│  固定视角缓慢旋转               │ AI Engineering           │
│                               │ 408                      │
│                               │ ...                      │
├───────────────────────────────┼──────────────────────────┤
│ 选中树的简短说明                │ [进入知识树]              │
│                               │ 综合题库   创建知识树       │
└───────────────────────────────┴──────────────────────────┘
```

建议比例：左 58%，右 42%。预览高度为 56-64dvh，最小 480px。

## 7.3 新组件

```text
src/features/library/components/KnowledgeLibraryHeader.tsx
src/features/library/components/KnowledgeLibrarySelector.tsx
src/features/library/components/SelectedTreeShowcase.tsx
src/features/library/components/KnowledgeTreeList.tsx
src/features/library/components/LibraryActionBar.tsx
```

职责：

- `KnowledgeLibraryHeader`：标题、简短说明、库选择器。
- `KnowledgeLibrarySelector`：当前只有一个选项，不伪造多库数据。
- `SelectedTreeShowcase`：选中树的独立三维模型。
- `KnowledgeTreeList`：只改变 `selectedTreeId`。
- `LibraryActionBar`：统一入口。

## 7.4 三维预览

从 `CustomTreeCanvas` 提取通用：

```text
src/features/knowledge-tree/components/KnowledgeTreeCanvas.tsx
```

Props：

```ts
interface KnowledgeTreeCanvasProps {
  treeId: string;
  mode: 'showcase' | 'readOnly' | 'edit' | 'placement';
  selectedPointId?: string | null;
  autoRotate?: boolean;
  onSelectPoint?: (id: string) => void;
  onMovePoint?: (id: string, position: [number, number, number]) => void;
}
```

`showcase` 模式：

- 只加载选中的一棵树。
- 固定观察目标，不允许拖拽节点。
- 自动旋转速度每秒约 2-3 度。
- 鼠标进入预览区时可以暂停自动旋转，离开后 1.2s 恢复。
- 不显示其他树、不显示大量 HTML 标签。
- 只点亮 1-2 条自然信号。
- 相机根据该树包围盒一次 fit，不跟随 hover 重算。

## 7.5 管理列表

每行显示：名称、知识点数量、学习进度或是否为空。不要加箭头暗示直接跳转。

交互：

- 单击行：切换选中态和左侧三维模型。
- Enter/Space：键盘切换选中态。
- 双击也不得直接进入，避免隐性行为。
- 当前行使用背景或文字权重区分，不给每行加彩色状态点。

## 7.6 集中操作区

`LibraryActionBar` 只出现一次：

- 主按钮：“进入知识树”。
- 次操作文本按钮：“综合题库”。
- 次操作文本按钮：“创建知识树”。

列表为空时：

- 左侧显示安静的空展示台。
- 主按钮改为“创建第一棵知识树”。
- 不显示不可用的“进入知识树”。

## 7.7 移动端

小于 768px：

1. 标题和库选择器。
2. 16:11 比例三维预览。
3. 横向或纵向单列树选择器。
4. 底部安全区上方固定操作条。

预览在性能档禁用自动旋转，保留静态三维构图。

---

# 8. 单知识树使用页面

## 8.1 页面壳

新增：

```text
src/features/knowledge-tree/pages/KnowledgeTreePage.tsx
src/features/knowledge-tree/components/KnowledgeTreeShell.tsx
src/features/knowledge-tree/components/TreeLocalNav.tsx
src/features/knowledge-tree/pages/TreeOverviewPage.tsx
src/features/knowledge-tree/pages/TreeLearningPage.tsx
src/features/knowledge-tree/pages/TreePracticePage.tsx
src/features/knowledge-tree/knowledge-tree.css
```

`KnowledgeTreeShell` 始终显示：

- 返回知识库。
- 知识树名称。
- 本地导航“总览 / 学习 / 题库”。
- 右侧“编辑”或“复制后编辑”。
- 子路由 Outlet。

默认路由落在总览，不自动进入编辑。

## 8.2 总览页

总览页任务：让用户理解这棵树，并决定继续学习还是查看结构。

首屏：

- 上部或左侧是该树的独立三维模型，高约 52-60dvh。
- 模型保持轻微生命感，但用户操作时立刻稳定。
- 右侧只显示名称、直接说明、已掌握知识点、上次学习位置。
- 唯一主按钮“继续学习”。

下部：

- 使用只读二维层级树展示知识点总览，类似数据结构中的树，不是把三维坐标压到二维。
- 二维树由真实 `hierarchy` 关系布局。
- 知识点显示掌握状态、是否有题目、是否有教学内容。
- 点击知识点只更新右侧摘要或进入该知识点，不允许拖动结构。

三维到二维的衔接：

- 滚动到结构区时，三维模型逐渐停止旋转并缩入顶部固定区域。
- 二维结构从模型的当前选中节点向下展开。
- 这是同一个知识结构的视角转换，不做第二次华丽入场。

如果实现复杂度影响稳定性，先使用 IntersectionObserver 控制两段 opacity/transform，不使用滚动劫持。

## 8.3 学习页

任务：选择学习范围并进入教学。

布局：

- 顶部显示推荐的下一个知识点和一枚主按钮“继续学习”。
- 下方按知识路径列出教学单元，显示未开始、进行中、已掌握。
- 每个列表项可进入对应 `LearningWorkspace`。
- 不在列表页展示完整教学正文。
- 不重复显示三维大模型，只保留小型结构定位或面包屑。

空状态：明确显示“这棵知识树还没有教学内容”，用户自建树可进入编辑内容。

## 8.4 题库页

任务：选择题目范围并开始练习。

顶部：

- 范围固定为当前知识树。
- 显示题目总量、已练习、错题数量。
- 一个主按钮“开始整树练习”。

下方：

- 按知识点分组显示题目覆盖。
- 点击知识点进入该知识点题库。
- 可保留“错题复习”作为当前树内的筛选，不创建全局错题首页。
- 不展示模拟卷、每日练习、目标练习等并列五标签，避免重新制造大题库首页。

## 8.5 编辑入口

用户树：点击“编辑”进入 `edit/structure`。

系统树：点击“复制后编辑”，先创建用户副本，再进入结构编辑页。不要让系统数据原地可写。

从编辑页返回时回到同一知识树总览，不跳到 `/library` 顶层。

---

# 9. 统一 LearningWorkspace 与 PracticeWorkspace

## 9.1 目标

Universe 和知识库不能各自创建教学页或刷题页。

新增：

```text
src/features/learning-workspace/LearningWorkspace.tsx
src/features/practice-workspace/PracticeWorkspace.tsx
src/features/workspace/WorkspaceHeader.tsx
src/features/workspace/useWorkspaceOrigin.ts
src/features/workspace/workspace.css
```

## 9.2 LearningWorkspace

从现有 `TeachingSessionPage.tsx` 提取主体，保留：

- `TeachingStepRail`
- `ContentBlockView`
- `QuestionCard`
- `TeachingCompletionEvidence`
- `teachingStore`
- `TeachingDecisionEngine`

改动：

- Props 或路由解析得到 `LearningScope`。
- point scope 直接解析该知识点教学单元。
- tree scope 先进入 `TreeLearningPage`，不直接随便取第一个单元。
- 顶部显示“计算机科学 / 前端开发 / HTTP”。
- 返回按钮根据 origin 回 Universe 或知识树。
- 完成后主操作“练习这个知识点”，次操作“返回知识树”。
- 删除“返回教学首页”。

## 9.3 PracticeWorkspace

从现有 `PracticeSessionPage.tsx` 提取主体，保留：

- `PracticeQuestion`
- `PracticeSessionSummary`
- `practiceStore`
- 作答、标记、题号导航、结果回写。

新增 `buildPracticePlan(scope)`：

```ts
function buildPracticePlan(scope: LearningScope): PracticePlan {
  const questions = scope.kind === 'point'
    ? repository.getQuestionsForPoint(scope.pointId)
    : scope.kind === 'tree'
      ? repository.getQuestionsForTree(scope.treeId)
      : repository.getQuestionsForLibrary(scope.libraryId);
  return deterministicOrderAndLimit(questions, scope);
}
```

工作区页面必须明确显示当前范围：

- 计算机科学综合题库。
- 前端开发知识树题库。
- HTTP 知识点题库。

完成后：

- 错题存在时主操作“学习错题知识点”。
- 无错题时主操作“返回知识树”。
- 不返回已删除的刷题首页。

## 9.4 Session Store 兼容

`practiceStore.sessionId` 可以继续持久化，但新增 `scope` 字段。旧 `node:${id}` 在迁移时转换为 point scope。

`teachingStore` 继续用 unitId，路由层负责 pointId → unitId。

不要为了统一命名重写已经通过测试的判题和教学状态机。

---

# 10. 创建知识树页面

## 10.1 替代旧五步创建器

旧 `LibraryBuilderPage` 不再同时负责来源、结构、教学、题目和预览。将其拆分后，`/trees/new` 只渲染 `TreeGenesisPage`。

新增：

```text
src/features/knowledge-tree-builder/pages/TreeGenesisPage.tsx
src/features/knowledge-tree-builder/components/GenesisStage.tsx
src/features/knowledge-tree-builder/components/TreeIdentityForm.tsx
src/features/knowledge-tree-builder/tree-genesis.css
```

## 10.2 桌面构图

```text
┌──────────────────────────────────────────────────────────┐
│ 返回知识库                                  创建知识树     │
├───────────────────────────────┬──────────────────────────┤
│                               │ 名称                     │
│          GenesisStage         │ 领域                     │
│          空无的深色空间         │ 简介                     │
│          逐渐诞生树的原点       │ 颜色                     │
│                               │                          │
│                               │ [创建知识树]              │
└───────────────────────────────┴──────────────────────────┘
```

左 60%，右 40%，右侧最大宽 520px。顶部只保留返回和当前任务，不显示其他编辑标签。

所有表单标签放在输入框上方。名称、领域、简介、颜色全部可空。颜色空时从克制色板中确定性选择。

## 10.3 GenesisStage 动画

状态：

```text
void → aperture → firstLight → fieldForming → treeReady
```

动画目的：表示一个可承载知识点的空间被创建。

时序：

- 初始：深色雾化表面和极淡空间纵深，没有节点、星空或随机粒子。
- 提交后 0-220ms：顶部出现窄光口。
- 180-560ms：一束柔和体积光落到舞台中心。
- 420-760ms：中心出现一个极小的结构原点和一圈空间波纹。
- 720-1040ms：相机轻微靠近，树的环境网格或关系基座出现。
- 1040ms：跳转到该树的结构编辑页，舞台对象通过共享背景保持连续。

没有视频素材时，不引入远程视频。使用 Three.js 光锥、CSS mask 和现有纹理即可。禁止爆炸粒子。

## 10.4 Store 行为

`libraryStore` 增加：

```ts
createEmptyTree(input: Partial<TreeIdentity>):
  { ok: true; treeId: string } |
  { ok: false; reason: 'duplicate-name' };
```

创建结果：

- `pointIds: []`
- `nodes: []`
- `edges: []`
- 状态可直接保存为用户树，不要求节点数量大于 0。

修改 `publishDraft` 中 `draft.nodes.length === 0` 的限制。空树是合法状态。

创建成功后进入：

```text
/library/computer/tree/:treeId/edit/structure
```

页面空状态唯一主按钮：“添加第一个知识点”。

## 10.5 编辑知识树自身

以后修改树名称、简介、颜色放在 `edit/settings`，不强迫用户创建时填完。

重名校验在创建和编辑时共用同一个函数，编辑自身名称时排除当前 treeId。

---

# 11. 创建知识点的连续双阶段施工图

## 11.1 持续父壳

新增：

```text
src/features/knowledge-point-builder/PointCreationShell.tsx
src/features/knowledge-point-builder/pages/PointContentPage.tsx
src/features/knowledge-point-builder/pages/PointPlacementPage.tsx
src/features/knowledge-point-builder/components/KnowledgeIdentityObject.tsx
src/features/knowledge-point-builder/components/PointIntrinsicForm.tsx
src/features/knowledge-point-builder/components/PointRelationForm.tsx
src/features/knowledge-point-builder/components/PlacementTreeStage.tsx
src/features/knowledge-point-builder/point-builder.css
```

`PointCreationShell` 持久挂载：

- 左侧舞台。
- 顶部光口。
- 同一个 `KnowledgeIdentityObject`。
- 草稿状态。
- 子路由 Outlet 只替换右侧表单。

这样从 `/content` 到 `/place` 时，知识卡片不会卸载。

## 11.2 草稿类型

```ts
interface PointDraft {
  id: string;
  treeId: string;
  name: string;
  kind: KnowledgePoint['kind'];
  description: string;
  content: string;
  color: string;
  difficulty?: KnowledgePoint['difficulty'];
  estimatedMinutes?: number;
  tags: string[];
  learningObjectives: string[];
  misconceptions: string[];
  recommendedContent: string[];
  position?: [number, number, number];
  parentId?: string;
  childIds: string[];
  prerequisiteIds: string[];
  relatedIds: string[];
}
```

草稿保存到单独的 V9 draft key。未最终提交前，不写入正式树。

## 11.3 内容页

左侧：

- 知识卡片宽 340-420px，高度随内容在 440-610px 之间。
- 从舞台中心下方 40px 浮上来，顶部光束照亮边缘。
- 卡片不是通用白卡，而是深色材质、1px 内高光、柔和树色边缘。
- 卡片实时显示名称、类别、说明、标签、难度和时长。
- 内容很多时不把所有正文塞入卡片，只显示摘要和计数。

右侧：

- 一个纵向滚动表单，不使用 tab。
- 字段按“身份、内容、教学信息”三组用留白分隔，不把每组套成卡片。
- 底部固定操作区：“取消”和唯一主按钮“设置位置与关系”。
- 所有字段都允许暂时为空；空名称提交时可生成“未命名知识点”。

颜色属于节点自身，在本页选择。层级、父子和位置不属于本页。

## 11.4 卡片凝聚为节点

不要继续使用单纯 `scale: 0.055`。

`KnowledgeIdentityObject` 使用一个 progress 值 `materializationProgress: 0..1` 驱动：

- 卡片宽高逐步收束。
- 卡片文字按层级退场，名称最后消失。
- 卡片边框颜色聚集到中心。
- 背景材质从矩形面过渡为圆形核心和半透明光晕。
- 光束宽度同步变窄，最后落在节点中心。
- 背后知识树从景深中逐渐清晰。
- 相机从卡片近景退到能看到整棵树的放置视角。

Motion 可以负责 DOM 卡片和遮罩，Three.js 负责最终节点。两者交接时保持同一屏幕中心和颜色。不要让 Motion 与 GSAP 同时修改同一个 transform。

推荐职责：

- GSAP 时间线控制导演式 progress 和光口。
- Motion 仅负责右侧表单切换和普通按钮。
- Three.js 根据 progress 显示预览节点。

## 11.5 位置与关系页

左侧：

- 显示当前独立知识树。
- 新节点保持选中和发光。
- 可拖动放置。
- 点击已有节点可设为父节点或关系目标。
- 关系草线使用曲线，未提交时颜色更淡。

右侧按顺序：

- 所在层级。
- 父节点。
- 子节点。
- 前置知识。
- 相关知识。
- 三维位置数值（默认折叠为“精确位置”，普通用户无需先碰坐标）。

底部唯一主按钮：“加入知识树”。

提交必须原子完成：

```ts
commitPointBundle({ point, memberships, relations })
```

任何一项失败时不允许只留下孤立节点或半条边。

## 11.6 返回和取消

- 从位置页返回内容页：节点沿相反动画恢复成卡片，草稿不丢。
- 取消创建：对象淡回光束，随后光口关闭，再返回结构编辑页。
- 创建完成：节点落入树中，树恢复正常视角，随后回到结构编辑页并保持该节点选中。
- 浏览器刷新：恢复当前阶段和草稿。

---

# 12. 单知识树编辑模式

## 12.1 编辑壳

新增：

```text
src/features/knowledge-tree-editor/TreeEditorShell.tsx
src/features/knowledge-tree-editor/pages/TreeStructureEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeContentEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeQuestionEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeSettingsPage.tsx
src/features/knowledge-tree-editor/components/EditorToolbar.tsx
src/features/knowledge-tree-editor/components/PointEditInspector.tsx
```

编辑壳顶部：

- 左侧“完成编辑”，返回该知识树总览。
- 中间“结构 / 内容 / 题目 / 设置”。
- 右侧只放当前页面主要操作。

编辑导航不出现在使用状态，避免普通用户误入。

## 12.2 结构编辑页

任务：编辑节点位置和关系。

- 主体全屏或大面积三维树。
- 顶部工具栏集中放“添加知识点”“连接”“自动整理”。
- 右侧 `PointEditInspector` 只在选中节点后出现。
- 允许拖动节点、修改父子和关系。
- 不在这个页面编辑长篇教学正文或批量题目。
- 空树只显示“添加第一个知识点”。

复用 `GraphEditorStep`、`CustomTreeCanvas` 的拖动、连接、布局和命中逻辑。

## 12.3 内容编辑页

任务：选择知识点并编辑它的概念和教学内容。

- 左侧或上方是可搜索知识点列表。
- 右侧复用 `PointIntrinsicForm`。
- 选中不同知识点时表单内容切换，不弹出多层 Modal。
- 保存反馈在原位置显示。

## 12.4 题目编辑页

任务：管理题目与知识点的绑定。

- 先选择知识点，再显示该知识点题目。
- 添加题目、编辑题目、删除题目集中在该区域。
- 不允许直接创建没有 pointId 的题目。
- 本轮静态 Demo 可使用已有确定性生成器补足大量题目。

## 12.5 设置页

任务：编辑知识树名称、简介、颜色和删除树。

- 名称重名校验。
- 删除属于破坏性操作，放在页面底部独立危险区域。
- 删除前显示树名和影响数量。
- 删除后返回 `/library`，说明是否可恢复。

---

# 13. 视觉系统与动画规范

## 13.1 色彩

继续使用现有 `src/design/tokens.css`，不另建第二套主题。

推荐锁定：

```css
--it-bg-deep: #050707;
--it-bg: #080a0a;
--it-surface: #0d0f0f;
--it-surface-raised: #131616;
--it-text: #efefe9;
--it-text-soft: #a7aaa3;
--it-text-faint: #696f6a;
--it-rule: rgb(239 239 233 / 0.10);
--it-accent: #d8c58f;
```

UI 只有一个交互强调色 `--it-accent`。知识节点可以使用多种语义颜色，但要低饱和、分支明确：暖金、冷青、石蓝、陶土、灰绿。

禁止：

- 大面积紫蓝 AI 渐变。
- 纯黑和纯白大块对撞。
- 所有面板都玻璃化。
- 每个按钮都有外发光。
- 所有光点使用同一种颜色。

## 13.2 字体与排版

- 继续使用项目现有现代无衬线字体策略，优先 Geist 或系统字体。
- 不为“高级感”加入随机衬线字体。
- 页面标题 28-42px，字重 520-620，负字距。
- 正文 14-16px，行高 1.6-1.75，宽度不超过 65 字符。
- 控件文案使用正常中文：“选择目标”“知识库”“编辑”“创建知识树”。
- 禁止“目标透镜”“因果走廊控制台”等故作文艺或技术炫耀的可见文案。

## 13.3 圆角和表面

- 按钮 7-8px。
- 输入框 7-8px。
- 主面板 10-12px。
- 只有明确表示选择器或分段控制时使用胶囊。
- 能用留白和一条分隔线组织的内容，不套卡片。

## 13.4 动画职责

| 动画 | 表达的信息 |
|---|---|
| 开屏俯视转斜视 | 从观察整体进入可操作空间 |
| 其他树移出画面 | 用户已缩小到一个学习方向 |
| 上下游链路点亮 | 当前知识点在结构中的因果位置 |
| hover 面板长高 | 同一对象从名称预览变成详细信息 |
| 知识树诞生 | 一个新的知识容器已被创建 |
| 卡片凝聚成节点 | 知识内容成为可被图结构引用的实体 |
| 节点落树与连线 | 节点与环境建立关系 |
| 路由共享对象 | 用户知道自己从哪里来、将去哪里 |

如果无法用一句话说明动画表达什么，就删除。

## 13.5 空闲生命感

- Universe 初次进入或 12-18 秒无操作后，整树可轻微旋转不超过 1.5 度、缩放不超过 1.5%、节点密度呼吸不超过 2%。
- 神经信号继续移动。
- 鼠标停在节点上时，无论多久都不启动空闲树形变。
- 用户开始旋转、平移、缩放、hover 或点击时，在 300-500ms 内回到标准结构。
- 空闲动画不得改变节点真实关系和可点击位置。

## 13.6 页面转场

全局普通页面：180ms 退场 + 320ms 入场，使用 opacity 和 y 6-10px。

同一知识树内部总览、学习、题库：保持 `KnowledgeTreeShell`，只替换 Outlet，避免整页闪黑。

创建知识点两个阶段：保持 `PointCreationShell` 和共享对象，不使用 `AnimatePresence mode="wait"` 销毁整页。

减少动态：所有镜头轨迹、自动旋转、卡片凝聚降级为 120-180ms 交叉淡化，功能不缺失。

---

# 14. Windows 与低性能设备优化

## 14.1 不可违反的降级顺序

Windows 卡顿时按顺序降低：

1. Bloom。
2. DPR。
3. 神经信号数量和刷新率。
4. 曲线分段数。
5. 自动旋转和空闲生命动画。
6. HTML 标签数量。

不得删除知识节点或知识关系来换性能。

## 14.2 Canvas 规则

- 主 Universe 继续 `frameloop="demand"`。
- 只有信号、相机或转场需要时 `invalidate()`。
- 浏览器标签隐藏时停止调度。
- Tree showcase 性能档最大 12-18fps 自动旋转；用户不可见时完全停止。
- DPR 建议：性能 `0.65-0.9`，均衡 `0.8-1.15`，质量 `1-1.5`。
- Bloom 分辨率保持 0.5 或性能档关闭。
- 连接线和节点复用几何与材质。
- 不在 `useFrame` 中调用 React `setState`。
- branch 位移结束后停止更新命中矩阵。
- 大量连续输入值使用 ref、uniform 或 MotionValue，不每帧重渲染 React 树。

## 14.3 多 Canvas 限制

- Universe 同一时间只存在一个主 Canvas。
- `/library` 只渲染一个选中树预览 Canvas，不为列表每行创建 Canvas。
- 单树总览只渲染一个 Canvas。
- 创建知识点父壳只渲染一个舞台 Canvas。
- 路由离开这些页面后正确 dispose geometry、material、controls 和定时器。

## 14.4 性能验收

至少测试：

- Windows 集显或 SwiftShader，1366×768，均衡模式。
- 336 节点全景持续交互 60 秒不冻结。
- 连续点击 20 个节点不发生内存持续增长。
- 切换四棵树时无几何频繁分配尖峰。
- `/library` 切换预览 20 次后只有一个 WebGL context。
- 后台标签页 10 秒后 CPU 接近空闲。

---

# 15. 无障碍与响应式

## 15.1 键盘

- 所有列表选项可 Tab 聚焦，Enter/Space 选择。
- Escape 按顺序关闭当前面板、取消创建阶段或返回上一级，不直接跳首页。
- 节点 Canvas 提供等价搜索或结构列表入口。
- 所有 icon button 有 `aria-label`。
- focus ring 使用 `--it-focus`，不能只靠颜色变化。

## 15.2 屏幕阅读器

- Canvas 的 aria-label 说明当前是全景、选中树或具体树。
- hover 信息不能是唯一信息来源，键盘聚焦节点时同样显示名称。
- 表单错误与字段通过 `aria-describedby` 关联。
- 动画不通过视觉状态独占表达成功，提交后有文本状态。

## 15.3 断点

必须在以下宽度测试：390、768、1024、1366、1440、1920。

- 小于 768px：所有左右分栏改成单列或底部 sheet。
- 小于 1024px：知识库管理页预览在上、列表在下。
- 高度小于 680px：减少开屏底部空白，保证进入按钮可见。
- 使用 `100dvh`，不使用 `100vh`。
- 安全区使用 `env(safe-area-inset-*)`。

---

# 16. 逐文件施工清单

## 16.1 新增

```text
src/domain/knowledge/types.ts
src/domain/knowledge/catalog.ts
src/domain/knowledge/selectors.ts
src/domain/knowledge/adapters.ts
src/domain/knowledge/scope.ts
src/domain/knowledge/migration.ts

src/features/spatial/landingPreview.ts
src/scene/BranchFocusController.ts
src/scene/branchTransforms.ts

src/features/library/components/KnowledgeLibraryHeader.tsx
src/features/library/components/KnowledgeLibrarySelector.tsx
src/features/library/components/SelectedTreeShowcase.tsx
src/features/library/components/KnowledgeTreeList.tsx
src/features/library/components/LibraryActionBar.tsx

src/features/knowledge-tree/components/KnowledgeTreeCanvas.tsx
src/features/knowledge-tree/components/KnowledgeTreeShell.tsx
src/features/knowledge-tree/components/TreeLocalNav.tsx
src/features/knowledge-tree/pages/TreeOverviewPage.tsx
src/features/knowledge-tree/pages/TreeLearningPage.tsx
src/features/knowledge-tree/pages/TreePracticePage.tsx
src/features/knowledge-tree/knowledge-tree.css

src/features/learning-workspace/LearningWorkspace.tsx
src/features/practice-workspace/PracticeWorkspace.tsx
src/features/workspace/WorkspaceHeader.tsx
src/features/workspace/useWorkspaceOrigin.ts
src/features/workspace/workspace.css

src/features/knowledge-tree-builder/pages/TreeGenesisPage.tsx
src/features/knowledge-tree-builder/components/GenesisStage.tsx
src/features/knowledge-tree-builder/components/TreeIdentityForm.tsx
src/features/knowledge-tree-builder/tree-genesis.css

src/features/knowledge-point-builder/PointCreationShell.tsx
src/features/knowledge-point-builder/pages/PointContentPage.tsx
src/features/knowledge-point-builder/pages/PointPlacementPage.tsx
src/features/knowledge-point-builder/components/KnowledgeIdentityObject.tsx
src/features/knowledge-point-builder/components/PointIntrinsicForm.tsx
src/features/knowledge-point-builder/components/PointRelationForm.tsx
src/features/knowledge-point-builder/components/PlacementTreeStage.tsx
src/features/knowledge-point-builder/point-builder.css

src/features/knowledge-tree-editor/TreeEditorShell.tsx
src/features/knowledge-tree-editor/pages/TreeStructureEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeContentEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeQuestionEditorPage.tsx
src/features/knowledge-tree-editor/pages/TreeSettingsPage.tsx
src/features/knowledge-tree-editor/components/EditorToolbar.tsx
src/features/knowledge-tree-editor/components/PointEditInspector.tsx
```

## 16.2 修改

```text
src/app/AppRouter.tsx
src/app/routes.ts
src/app/AppShell.tsx
src/app/RouteTransition.tsx
src/components/navigation/GlobalNav.tsx
src/components/navigation/MobileNav.tsx
src/features/landing/pages/LandingPage.tsx
src/features/spatial/SpatialExperienceContext.ts
src/features/spatial/SpatialExperienceShell.tsx
src/features/universe/pages/UniversePage.tsx
src/components/ExplorerInterface.tsx
src/components/NodeInspector.tsx
src/store/knowledgeStore.ts
src/graph/relevance.ts
src/scene/CameraController.tsx
src/scene/UniverseCanvas.tsx
src/scene/NodePointField.tsx
src/scene/NodeHitField.tsx
src/scene/BatchedKnowledgeEdges.tsx
src/features/library/pages/LibraryHomePage.tsx
src/features/library/pages/LibraryDetailPage.tsx
src/features/library-builder/components/CustomTreeCanvas.tsx
src/features/library-builder/components/GraphEditorStep.tsx
src/store/libraryStore.ts
src/services/content/ContentRepository.ts
src/store/practiceStore.ts
src/features/teaching/pages/TeachingSessionPage.tsx
src/features/practice/pages/PracticeSessionPage.tsx
src/design/tokens.css
src/design/app.css
src/design/landing.css
```

## 16.3 最终删除

只有迁移完成且无引用后删除：

```text
src/components/CausalCorridorDock.tsx
src/features/teaching/pages/TeachingHomePage.tsx
src/features/practice/pages/PracticeHomePage.tsx
src/features/library/components/PrimaryLibrary.tsx
src/features/library/components/LibraryGraphThumbnail.tsx
src/features/library/components/UniversityTemplateRail.tsx
src/features/library-builder/components/TeachingSchemaStep.tsx
src/features/library-builder/components/QuestionGenerationStep.tsx
src/features/library-builder/components/PublishPreviewStep.tsx
```

`NodeAtelier.tsx` 在新双阶段页面稳定后删除。不要同时保留两个创建节点入口。

---

# 17. 分批施工顺序

## 批次 0：保护当前工作区

1. 查看 `git status --short`。
2. 不清理未知改动，不执行 `git reset --hard` 或 `git clean`。
3. 运行当前 `typecheck`、单元测试、构建，记录基线失败。
4. 创建施工分支或工作树，分支名使用 `codex/iteach-v9-product-architecture` 或执行 Agent 自己的安全分支。

停止条件：现有基线被记录，可回退。

## 批次 1：领域模型与兼容适配

1. 新增 `src/domain/knowledge`。
2. 定义 Library、Tree、Point、Scope。
3. 把现有四个 branch 适配成计算机知识库的树。
4. 扩展 ContentRepository。
5. 增加旧持久化迁移。
6. 为聚合题库和重名规则写单元测试。

停止条件：旧 336 节点仍可读取；树和库的题目聚合无重复。

## 批次 2：路由和全局导航收束

1. 更新 ROUTES。
2. 新建共享树壳和工作区路由占位。
3. 删除全局教学、刷题导航项。
4. 保留旧路由兼容重定向。
5. 移动端菜单同步。

停止条件：全局导航只有知识空间和知识库；旧收藏链接不 404。

## 批次 3：开屏与入场修复

1. 新增 landing preview 临时高亮。
2. 增加 `prepareUniverseEntry`。
3. 简化 Landing DOM。
4. 扩大开屏镜头距离。
5. 实现导航延后展开。
6. 写 E2E 验证旧目标不残留。

停止条件：开屏到 Universe 连续、无旧高亮、按钮唯一。

## 批次 4：Universe 树隔离和稳定连线

1. 新增 BranchFocusController。
2. 节点、边、命中层使用相同树变换。
3. 删除 selectionKey 对 uReveal 的重置。
4. 确认信号不受 hover 控制。
5. 连续点击节点做性能测试。

停止条件：选择树后其他树在屏幕外；连续点节点不重绘连线。

## 批次 5：右侧面板整合

1. 把关系控制移入 NodeInspector。
2. 删除 ExplorerInterface 中底部 Dock。
3. 限制学习和练习动作到知识点。
4. 完善 hover → click → close 连续状态。
5. 移动端改底部 sheet。

停止条件：屏幕只有一个节点信息面板；标题对象身份连续。

## 批次 6：知识库总管理页

1. 新增五个管理组件。
2. 提取 showcase 模式 Canvas。
3. 列表只控制预览。
4. 操作集中到 ActionBar。
5. 移除主知识库和课程导入。

停止条件：用户能明确完成“选树、看树、进入树”，页面无其他职责。

## 批次 7：单知识树使用态

1. 完成 Shell、本地导航和总览。
2. 完成学习范围页。
3. 完成题库范围页。
4. 默认总览，编辑按钮单独存在。
5. 系统树和用户树权限区分。

停止条件：从知识库进入默认是使用态，编辑工具未加载。

## 批次 8：统一教学和题库工作区

1. 从旧 SessionPage 提取共享主体。
2. 增加 Scope 和 origin。
3. Universe 与知识树都跳到同一 canonical URL。
4. 完成后返回来源正确。
5. 移除两个独立首页。

停止条件：同一知识点无论从哪个入口进入，页面和会话完全相同。

## 批次 9：创建空知识树

1. 实现 TreeGenesisPage。
2. 所有字段可空。
3. 实现自动命名与重名校验。
4. 允许空树保存。
5. 创建后进入结构编辑空状态。

停止条件：可以创建空树，且同库不能出现规范化同名树。

## 批次 10：知识点双阶段创建

1. 建立持续 PointCreationShell。
2. 完成内容页和实时卡片。
3. 完成卡片到节点的共享对象动画。
4. 完成位置与关系页。
5. 原子提交并返回结构编辑。

停止条件：卡片不被替换，节点正确进入树并持久化。

## 批次 11：树编辑器收束

1. 将 GraphEditor 核心移入结构编辑页。
2. 完成内容、题目、设置页面。
3. 删除旧五步 Builder 和 NodeAtelier 引用。
4. 删除无引用旧组件。

停止条件：使用态和编辑态职责清楚，没有两个节点创建入口。

## 批次 12：视觉、性能、无障碍和 E2E

1. 统一 token、间距、圆角和文案。
2. 处理 390-1920 响应式。
3. Windows/S SwiftShader 性能测试。
4. Reduced motion 测试。
5. 完整 E2E。
6. 删除调试输出和过期 CSS。

停止条件：第 19 章全部通过。

每个批次结束必须运行：

```bash
npm run typecheck
npm test
npm run build
```

只在相关 E2E 已存在后运行：

```bash
npm run test:e2e
```

---

# 18. 自动化测试清单

## 18.1 单元测试

新增或扩展：

- `knowledgeDomain.test.ts`：三层层级和 branch 适配。
- `scope.test.ts`：point/tree/library 题目聚合与去重。
- `treeName.test.ts`：空名称编号、空格折叠、大小写和中文重名。
- `libraryMigration.test.ts`：V7/V8 UserLibrary 到 V9 Tree。
- `branchTransforms.test.ts`：active tree 中心化、其他树移出、返回可逆。
- `pointBundle.test.ts`：节点、membership、relations 原子提交。
- 保留教学决策、题目判定、持久化和质量策略现有测试。

## 18.2 E2E 文件

```text
e2e/landing-entry-reset.spec.ts
e2e/universe-tree-focus.spec.ts
e2e/universe-node-inspector.spec.ts
e2e/library-management.spec.ts
e2e/tree-use-mode.spec.ts
e2e/workspace-routing.spec.ts
e2e/tree-genesis.spec.ts
e2e/point-creation.spec.ts
e2e/persistence-v9.spec.ts
e2e/responsive-v9.spec.ts
e2e/windows-performance-smoke.spec.ts
```

关键断言：

1. 预先持久化 frontend 目标，打开 `/` 后开屏可随机高亮；点击进入后 frontend 不保持选择态。
2. 进入过程中 Canvas DOM 不更换，导航在镜头运动后半段出现。
3. 选择一棵树后其他树不可见但返回 overview 后恢复。
4. 连续选择两个节点，边 geometry identity 不变化或 draw-on 不重启。
5. 任意可见节点都能 hover 和 click。
6. hover 名称与 click 详情使用同一个 inspector 元素。
7. 页面不存在底部 corridor dock。
8. `/library` 列表行只切换 preview，只有“进入知识树”跳转。
9. 单树默认总览，未点击编辑时结构编辑工具不存在。
10. Universe 和知识树进入同一点后 URL 和 workspace 主体一致。
11. 知识库、知识树、知识点三种题库范围标题正确且题目不重复。
12. 空字段能创建树；同名树出现行内错误。
13. 创建树后不自动出现根节点。
14. 节点内容页到放置页共享对象仍存在。
15. 放置完成后刷新页面，节点、位置和关系仍存在。
16. 390px 不横向溢出，所有主按钮可见。

---

# 19. 最终验收标准

只有以下全部成立才算完成：

## 19.1 产品逻辑

- [ ] 用户能准确理解知识库、知识树、知识点三层关系。
- [ ] 全局导航没有教学和刷题。
- [ ] 学习、刷题入口都带有明确范围。
- [ ] 题目和教学内容绑定知识点，树和库只聚合。
- [ ] Universe 与知识库复用同一工作区。
- [ ] 单树默认使用态，编辑态必须主动进入。

## 19.2 开屏与 Universe

- [ ] 开屏只保留品牌和一个进入按钮。
- [ ] 开屏显示整棵树远景和临时随机路径。
- [ ] 进入前清除旧选择和临时高亮。
- [ ] 相机连续从俯视转斜视并拉近。
- [ ] 导航在过渡中后段自然展开。
- [ ] 选择树后其他树移出屏幕。
- [ ] 选择节点不重新播放连线入场。
- [ ] 神经信号持续流动且不受 hover 影响。
- [ ] 所有节点可操作，镜头拖动不误点。

## 19.3 面板

- [ ] hover 显示名称，click 在同一外壳展开。
- [ ] 不出现旧面板消失、新面板再入场。
- [ ] 关系控制已合并到右侧面板。
- [ ] 底部重复面板已删除。
- [ ] 只有具体知识点显示学习和练习。

## 19.4 知识库和知识树

- [ ] `/library` 只有预览、管理列表、集中操作三类区域。
- [ ] 没有“主知识库”。
- [ ] 没有二维压缩三维树。
- [ ] 没有课程导入混在管理页。
- [ ] 列表不能直接进入树。
- [ ] 单树总览、学习、题库职责分开。
- [ ] 用户树可编辑，系统树先复制。

## 19.5 创建

- [ ] 空字段也能创建知识树。
- [ ] 同一知识库不能有规范化同名树。
- [ ] 创建知识树不自动创建节点。
- [ ] 空树可以保存和再次编辑。
- [ ] 知识点先编辑自身，再编辑环境关系。
- [ ] 卡片到节点保持对象身份、颜色和空间方向。
- [ ] 节点可拖动、设置父子和关联。
- [ ] 最终提交原子化并持久化。

## 19.6 教学和题库

- [ ] 8 步教学闭环继续可运行。
- [ ] 知识点题库、知识树题库、知识库综合题库范围正确。
- [ ] 作答回写掌握度和错因。
- [ ] 错题能进入对应知识点教学。
- [ ] 教学完成能进入对应知识点题库。
- [ ] 比赛演示数据足够连续体验，不依赖网络 API。

## 19.7 质量

- [ ] TypeScript、单元测试、构建、E2E 全部通过。
- [ ] 390、768、1024、1366、1440、1920 无遮挡和横向溢出。
- [ ] Windows 均衡模式可稳定操作。
- [ ] 页面隐藏后不持续高 CPU。
- [ ] reduced motion 完整可用。
- [ ] 键盘、焦点和错误提示完整。
- [ ] 控制台无 Error。
- [ ] 深层路由刷新不 404。

---

# 20. 明确不做的内容

为了保证本轮一次施工完成，以下内容不进入 V9：

- 第二个专业知识库的真实内容。
- 远程后端、账号同步和多人协作。
- 真正的 OpenAI 在线生成，仅保留兼容接口和本地演示。
- 复杂导入向导。现有解析器保留，但不放进核心管理流程。
- 每棵树独立的新教学页面或新题库页面。
- 新的动画库、图数据库或 UI 框架。
- 视频背景素材依赖。
- 无意义粒子、爆炸、随机霓虹和大面积玻璃卡片。

以后扩展其他知识库时，只需要：

1. 新增 `KnowledgeLibrary` 目录项。
2. 新增对应 `KnowledgeTree` 和 `TreeMembership` 数据。
3. 提供该领域的知识点、教学单元和题目。
4. 复用本文件规定的所有页面和工作区。

---

# 21. 交付报告模板

执行 Agent 完成后必须按下面结构汇报：

1. 修改文件列表，按新增、修改、删除分组。
2. 完成的用户流程。
3. 复用的已有能力。
4. 删除的重复功能。
5. 数据迁移说明。
6. 路由兼容说明。
7. 动画和连续性说明。
8. Windows 性能处理。
9. 无障碍和响应式结果。
10. `typecheck`、单元测试、构建、E2E 的真实结果。
11. 当前仍存在的不足。
12. 后续只需要微调的项目。

报告不得把“代码已写”当成“功能完成”。每项必须附带可访问路由、测试结果或截图证据。
