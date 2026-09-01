# iTeach V6 多模块教学产品施工蓝图

> 文档状态：方案冻结稿，尚未进入代码施工  
> 项目路径：`/Users/morton_cheung/Desktop/AI/iTeach`  
> 核心目标：把单页三维知识导航升级为可创建知识库、接受系统教学、完成练习并回写掌握度的完整静态教学产品。

## 0. 先给结论

iTeach V6 不再把“三维知识宇宙”当作整个产品，而是把它作为四个核心模块之一。

最终产品由四个互相回写状态的工作区组成：

1. **知识空间**：看见知识关系、选择目标、定位薄弱节点。
2. **教学空间**：系统诊断、讲解、示范、提问、纠错和复教。
3. **刷题中心**：按知识点、薄弱项、目标和试卷进行练习。
4. **知识库**：浏览预置知识库，并创建自己的知识库和教学单元。

这四个模块形成真实教学闭环：

```text
知识空间定位目标
  -> 教学空间进行前置诊断
  -> 分步讲解与示范
  -> 刷题中心完成形成性评价
  -> 错因映射到知识节点
  -> 自动安排补救教学
  -> 更新掌握度并重组知识空间
```

这正是 `study` 与 `teach` 的区别。`study` 只给资源和路径；`teach` 会判断学生当前状态、决定下一步、给出反馈，并在未掌握时改变教学策略。

## 1. 设计读取与施工边界

### 1.1 设计读取

将本项目理解为：面向 iTeach 比赛评委的大学教育产品，采用黑色、克制、编辑感和空间关系表达，具有 Awwwards 级过渡质感，但所有动画都服务于教学状态变化。

固定设计旋钮：

- `DESIGN_VARIANCE: 7/10`
- `MOTION_INTENSITY: 7/10`
- `VISUAL_DENSITY: 6/10`
- 主题：固定深色
- 产品语言：功能性中文，不使用“目标透镜”“学习星河”等故作文艺的词
- 图标：只使用 `@phosphor-icons/react`
- 字体：Instrument Sans / Geist Mono / 中文系统字体

### 1.2 本轮明确做什么

- 规划完整的多路由静态 SPA。
- 保留现有 336 个节点和 646 条关系作为底层知识图谱。
- 新增自定义知识库、教学、刷题、学习记录四类数据域。
- 规定每个页面的组件位置、交互、状态和动效职责。
- 规定大量虚拟数据的生成方式，保证内容丰富但构建体积可控。
- 把用户指定的十个前端仓库逐一落实到项目中的具体位置。
- 继续保留 Windows 核显和移动设备的性能分级。

### 1.3 本轮明确不做什么

- 不接真实后端、数据库、登录、文件解析或真实大模型接口。
- 不伪装网络能力。上传、AI 解析、AI 讲解都标记为本地演示数据。
- 不把十个资源仓库的源码整体复制进运行时。
- 不在同一组件内同时使用 Motion、GSAP 和 Anime.js。
- 不为“炫酷”增加随机粒子、永久光束、循环呼吸或背景视频。
- 不把产品改成卡片式后台 Dashboard。

## 2. 当前项目审计

### 2.1 可直接保留的资产

- `src/data/knowledgeGraph.ts`：336 个计算机知识节点，覆盖 408、AI、游戏开发和前端开发。
- `src/graph/GraphRepository.ts`：图查询边界，可继续扩展掌握度和教学关系查询。
- `src/scene/NodePointField.tsx`：单批次 GPU 点渲染，可作为知识空间主渲染器。
- `src/scene/BatchedKnowledgeEdges.tsx`：分批曲线连接，可继续承载掌握度和教学路径状态。
- `src/performance/qualityPolicy.ts`：质量、均衡、性能三个档位。
- `src/store/knowledgeStore.ts`：知识空间状态，可保留但不再承担整个产品的全局状态。
- `src/ai/localKnowledgeAI.ts`：本地 AI 回退雏形，可升级为静态教学决策引擎。

### 2.2 必须重构的部分

- `src/App.tsx` 目前只有一个全屏场景，需要改为路由入口和分包边界。
- `TopBar` 目前只有图谱工具，需要升级为全产品导航。
- Zustand 当前只有一个 store，需要按用户、知识库、教学、练习和界面拆分。
- 现有节点详情只“解释知识”，没有诊断、示范、练习、纠错和复教。
- 数据目前围绕图节点，缺少课程教学单元、题目、错因和掌握证据。

### 2.3 必须保留的识别度

- 全屏三维知识网络仍是默认入口和比赛作品的视觉记忆点。
- 节点是发光神经元，连接是突触，点击后完整上下游链路点亮。
- 黑色编辑感、低饱和域色、暖白当前焦点。
- 桌面详情区固定在右侧，移动端固定为底部面板。
- 用户始终可以自由旋转、平移和缩放知识空间。

### 2.4 当前工程基线

方案冻结时已验证：

- 单元测试：2 个测试文件、10 项测试全部通过。
- 生产构建：通过。
- 当前 `spatial-runtime`：约 992.74 KB，gzip 约 265.92 KB，已经独立分包。
- V6 必须继续保持三维运行时独立，并确保教学、刷题和知识库首页不会预加载该分包。

## 3. 产品信息架构

### 3.1 一级导航

桌面端顶部导航固定 64 px 高，按以下顺序出现：

```text
[iTeach 标志]  知识空间  教学  刷题  知识库                         [搜索] [学习记录] [头像]
```

移动端顶部只保留：

```text
[iTeach]                                         [搜索] [菜单]
```

移动端菜单从右侧进入，包含四个一级入口和“重置演示数据”。

导航文案必须是：

- 知识空间
- 教学
- 刷题
- 知识库
- 学习记录
- 搜索

禁止使用隐喻名称。

### 3.2 路由设计

```text
/
  -> 重定向到 /universe

/universe
  -> 三维知识空间

/teach
  -> 当前教学任务和推荐教学单元

/teach/:unitId
  -> 单个教学会话

/practice
  -> 刷题入口和题库选择

/practice/session/:sessionId
  -> 一题一屏的刷题会话

/library
  -> 自己的知识库与大学知识库模板

/library/new
  -> 创建自定义知识库

/library/:libraryId
  -> 知识库概览、节点、教学单元和题目

/progress
  -> 学习证据、掌握度变化和错因记录
```

使用 `react-router-dom` 的 `BrowserRouter`。部署时增加 SPA fallback；各页面使用 `lazy()` 分包。三维包只在 `/universe` 和自定义知识库的三维预览步骤加载。

### 3.3 页面之间的状态回写

```text
/universe 选择节点
  -> 创建 teaching recommendation
  -> /teach/:unitId

/teach 完成诊断或引导练习
  -> 写入 EvidenceRecord
  -> 更新 MasteryState

/practice 提交答案
  -> 写入 AnswerRecord + MisconceptionRecord
  -> 若连续错误，创建 RemediationTask

/progress 展示证据
  -> 可回到 /teach 补救

/library/new 发布知识库
  -> 新知识库出现在 /library
  -> 可直接生成教学单元和题集
```

## 4. 全局 App Shell 施工规格

### 4.1 文件位置

```text
src/app/AppRouter.tsx
src/app/AppShell.tsx
src/app/routes.ts
src/app/RouteTransition.tsx
src/components/navigation/GlobalNav.tsx
src/components/navigation/MobileNav.tsx
src/components/search/GlobalSearch.tsx
src/components/feedback/DemoDataBadge.tsx
```

### 4.2 桌面布局

- 顶部导航：`position: fixed; top: 0; left: 0; right: 0; height: 64px; z-index: 100`。
- 左侧品牌区宽 220 px。
- 中间一级导航使用自然宽度，不做等宽胶囊。
- 右侧工具区固定最小宽度 260 px。
- 当前导航项仅用文字亮度和底部 1 px 暖金线表达。
- 页面内容从 `padding-top: 64px` 开始。
- 除 `/universe` 外，内容最大宽度 1600 px，左右边距使用 `clamp(20px, 3vw, 48px)`。

### 4.3 响应式规则

- `>= 1280 px`：完整导航和双侧工作区。
- `1024 - 1279 px`：压缩页面留白，右侧工作区缩至 340 px。
- `768 - 1023 px`：隐藏次要导航工具，右侧面板改为可覆盖抽屉。
- `< 768 px`：单列内容；教学和刷题的侧栏改为底部 Sheet；知识库编辑器切换到步骤页模式。
- 所有全高页面使用 `min-height: calc(100dvh - 64px)`，禁止 `100vh`。

### 4.4 路由过渡

`RouteTransition.tsx` 只使用 Motion：

- 新页面：`opacity 0 -> 1`，`y 8 -> 0`，360 ms。
- 旧页面：`opacity 1 -> 0`，180 ms。
- 共享标题和知识节点入口使用 `layoutId`，但只允许 1 个共享元素。
- `/universe` 与普通页面切换时不推动 Canvas，直接淡出 DOM 并暂停 WebGL。
- `prefers-reduced-motion` 下立即切换。

## 5. 知识空间页面 `/universe`

### 5.1 页面职责

只负责“观察知识、定位目标、选择节点、查看掌握状态和进入教学”。不再承担完整教学内容。

### 5.2 桌面结构

```text
┌──────────────────── 全局导航 64 ────────────────────┐
│                                                     │
│             全屏三维知识空间                         │
│                                                     │
│ 左下：当前范围/节点数             右侧：节点预览区    │
│                                   hover 只显示名称    │
│                                   click 展开详情      │
│                                                     │
│              底部：关系范围控制                      │
└─────────────────────────────────────────────────────┘
```

### 5.3 右侧预览与详情

文件：`src/features/universe/components/NodeContextPanel.tsx`

状态机：

```ts
type NodePanelMode = 'idle' | 'preview' | 'detail';
```

- `idle`：只显示一句操作说明和当前知识范围。
- `preview`：鼠标悬停任意节点时，右侧 360 px 区域显示名称、类型、所属课程和“点击查看”。不出现大面板边框。
- `detail`：点击后，右侧工作区从预览位置扩展至 410 px，显示知识说明、路径、掌握度证据、前置和后续关系。
- 主按钮改为“开始教学”。次按钮为“练习这个知识点”。
- 面板位置永远在右侧；移动端永远从底部展开。

### 5.4 与教学模块的连接

点击“开始教学”：

```ts
createTeachingSession({
  nodeId,
  source: 'universe',
  learnerProfileId: activeProfileId,
});
navigate(`/teach/${unitId}`);
```

路由离开前，节点链路光信号从当前节点向教学单元入口传播一次，时长 420 ms。这个动画只表示“把该知识送入教学流程”。

## 6. 教学首页 `/teach`

### 6.1 页面职责

回答三个问题：

1. 现在应该教什么？
2. 为什么教这个？
3. 学生上一次卡在哪里？

### 6.2 桌面布局

基准 1440 x 900：

- 页面左边距 48 px，右边距 48 px。
- 标题区高度约 150 px，只使用“教学”和一句说明。
- 主推荐区域占 8 列，右侧“需要复习”占 4 列。
- 下方不是三张等宽卡片，而是一条可横向选择的教学队列和一个宽幅知识关系预览。

```text
教学
根据你的目标和最近练习，系统已经安排下一节课。

┌──────────── 推荐教学任务 8列 ───────────┬── 需要复习 4列 ──┐
│ 进程与线程                               │ TCP 拥塞控制       │
│ 先诊断，再讲解，再练习                    │ 二叉树遍历          │
│ [继续教学] [查看依据]                    │ React 状态更新      │
└──────────────────────────────────────────┴───────────────────┘

教学队列：前置诊断 -> 新知识 -> 巩固 -> 复教

宽幅关系预览：本节知识在完整知识图谱中的位置
```

### 6.3 组件

```text
src/features/teaching/pages/TeachingHomePage.tsx
src/features/teaching/components/NextLessonHero.tsx
src/features/teaching/components/TeachingQueue.tsx
src/features/teaching/components/ReviewList.tsx
src/features/teaching/components/LessonGraphPreview.tsx
src/features/teaching/components/RecommendationReason.tsx
```

`NextLessonHero` 必须展示真实教学原因，例如：

```text
你已完成“进程调度”基础题，但在“线程共享资源”上连续两次混淆。
本节先区分进程与线程，再用调度示例检验理解。
```

禁止文案：

- 解锁你的学习潜能
- 开启智慧之旅
- AI 为你量身定制
- 探索知识的无限可能

## 7. 教学会话 `/teach/:unitId`

### 7.1 教学闭环

每个教学会话必须完整包含：

```text
学习目标
  -> 前置诊断
  -> 概念讲解
  -> 教师示范
  -> 引导练习
  -> 独立检查
  -> 错因反馈
  -> 补救讲解或进入下一节
```

只有“讲解 + 练习”不算教学完成。必须有诊断、反馈和根据结果改变下一步。

### 7.2 桌面页面结构

```text
┌──────── 课程步骤 248px ───────┬──── 教学舞台 minmax(0,1fr) ────┬── 教学判断 340px ──┐
│ 学习目标                      │ 当前讲解、图示或示例             │ 为什么这样教        │
│ 前置诊断                      │                                 │ 已发现的误区         │
│ 概念讲解                      │ 底部固定：上一步 / 提交 / 下一步  │ 当前掌握证据         │
│ 教师示范                      │                                 │ 与知识图谱的关系     │
│ 引导练习                      │                                 │                     │
│ 独立检查                      │                                 │                     │
└───────────────────────────────┴─────────────────────────────────┴─────────────────────┘
```

页面内容区域高度为 `calc(100dvh - 64px)`，不产生整页滚动。只有中间教学内容和右侧判断区可以独立滚动。

### 7.3 左侧步骤轨

文件：`TeachingStepRail.tsx`

- 宽 248 px。
- 使用文本列表和一条连续竖线，不使用七张步骤卡。
- 当前步骤为暖白；已完成为低饱和绿色；后续为灰色。
- 点击已完成步骤可回看，未解锁步骤不可直接跳转。
- 每一步显示名称和预计时间，不显示“Step 1”之类泛化编号。

### 7.4 中央教学舞台

文件：`TeachingStage.tsx`

按照 `TeachingStep.kind` 渲染不同内容：

```ts
type TeachingStepKind =
  | 'objective'
  | 'diagnostic'
  | 'explanation'
  | 'worked-example'
  | 'guided-practice'
  | 'independent-check'
  | 'remediation'
  | 'summary';
```

子组件：

```text
ObjectiveStep.tsx
DiagnosticStep.tsx
ConceptExplanation.tsx
WorkedExample.tsx
GuidedPractice.tsx
IndependentCheck.tsx
RemediationStep.tsx
LessonSummary.tsx
TeachingStageFooter.tsx
```

教学舞台不是聊天窗口。AI 讲解以结构化教学内容呈现：概念、关键区别、可视化、示例和检查问题。

### 7.5 右侧教学判断区

文件：`TeachingEvidencePanel.tsx`

宽 340 px，固定在右侧，包含：

- 本节教学依据
- 已掌握的前置知识
- 当前检测到的误区
- 最近一次回答证据
- 下一步教学决策
- 知识图谱中的上游与下游

“下一步教学决策”必须是明确句子：

```text
你能区分进程和线程的资源边界，但还不能判断线程切换的开销来源。
下一步将使用一个调度实例重新示范。
```

### 7.6 教学决策逻辑

静态演示使用确定性规则，不调用网络：

```ts
if (diagnosticScore < 0.5) {
  next = 'prerequisite-remediation';
} else if (guidedPractice.misconceptionId) {
  next = `remediation:${guidedPractice.misconceptionId}`;
} else if (independentCheck.score >= 0.8) {
  next = 'summary-and-practice';
} else {
  next = 'alternate-explanation';
}
```

同一题目的不同选项必须触发不同解释，不能统一显示“回答错误”。

### 7.7 教学动效

- 教学步骤切换由 GSAP timeline 编排，旧内容 140 ms 淡出，新内容按“标题、图示、解释、操作”依次进入，总时长 520 ms。
- React 生命周期使用 `useGSAP({ scope })`，事件回调使用 `contextSafe()`，卸载时全部回收。
- Motion 只负责按钮、折叠区和步骤轨的布局变化，不与 GSAP 控制同一元素。
- 讲解图中的关系光束使用 React 改写版 `TeachingRelationBeam`，只在数据流发生时播放一次。
- 减少动态效果时取消位移和光束，只保留内容替换。

## 8. 刷题首页 `/practice`

### 8.1 页面职责

让用户快速进入适合当前状态的练习，不展示一个泛化数据看板。

### 8.2 页面结构

```text
刷题
选择练习方式，系统会把错误回写到知识图谱。

左侧 8 列：
  今日练习主入口
  当前建议：20 题，预计 28 分钟
  题目来自：408 数据结构、操作系统、网络
  [开始练习]

右侧 4 列：
  薄弱知识点列表
  可点击“只练这个知识点”

下方：
  按目标练习 / 按知识点练习 / 模拟试卷 / 错题复习
```

### 8.3 组件

```text
src/features/practice/pages/PracticeHomePage.tsx
src/features/practice/components/DailyPracticeHero.tsx
src/features/practice/components/WeakNodeList.tsx
src/features/practice/components/PracticeModeTabs.tsx
src/features/practice/components/KnowledgeQuestionPicker.tsx
src/features/practice/components/MockPaperList.tsx
src/features/practice/components/MistakeReviewQueue.tsx
```

`PracticeModeTabs` 使用 Inspira Animated Tabs 的 React 重写思路和 Motion `layoutId`，但外观改成窄矩形文字标签，不复制胶囊样式。

## 9. 刷题会话 `/practice/session/:sessionId`

### 9.1 桌面布局

```text
┌── 题目导航 220px ──┬──── 当前题目 minmax(0,1fr) ────┬── 提交后反馈 360px ──┐
│ 题号与答题状态      │ 题干                           │ 正确答案与解析       │
│ 标记与筛选          │ 选项 / 编程输入 / 排序操作      │ 错因                 │
│                     │ 底部：上一题 / 提交 / 下一题    │ 对应知识节点         │
└─────────────────────┴────────────────────────────────┴──────────────────────┘
```

提交前右侧不显示答案，只显示本题关联知识和可用提示。提交后右侧原地扩展为反馈，不允许左右跳动。

### 9.2 题型

```ts
type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'ordering'
  | 'code-trace'
  | 'short-answer';
```

比赛主流程优先展示：单选、代码跟踪、排序和简答判断。

### 9.3 答题反馈

正确时：

- 说明为什么正确。
- 指出该答案证明了哪项能力。
- 给出一个可选的更难变式。

错误时：

- 识别具体误区。
- 解释错误选项为何具有迷惑性。
- 点亮相关前置节点。
- 提供“重新讲解”按钮，跳转到对应补救教学步骤。

### 9.4 完成动效

Lottie 只在三类真正完成事件中播放一次：教学掌握确认、模拟试卷完成、知识库发布成功。三类事件共用同一套克制的“关系闭合”视觉语言，不在普通答题和页面加载中出现。

练习结果页规格：

- 位置：结果页标题右侧，最大 88 x 88 px。
- 时长：1.2 秒，不循环。
- 内容：一条知识连接闭合并稳定发光，不使用奖杯、烟花或彩纸。
- JSON 分别放在 `public/lottie/mastery-confirmed.json`、`exam-completed.json` 和 `library-published.json`。
- 通过 `lottie-web/build/player/lottie_light` 动态导入。
- 减少动态效果时显示静态最终帧。

## 10. 知识库首页 `/library`

### 10.1 页面职责

展示用户拥有的知识库、大学计算机知识库模板和创建入口。

### 10.2 页面结构

不使用规则的三列卡片墙，采用“一个主知识库 + 紧凑列表 + 横向模板带”：

```text
知识库                                      [创建知识库]

┌──────── 当前主知识库 7列 ────────┬──── 我的知识库列表 5列 ────┐
│ 计算机考研 408                    │ 前端工程体系                │
│ 小型关系预览                     │ 游戏开发基础                │
│ 336 节点 / 646 关系              │ AI 工程路径                 │
│ [打开知识库]                     │ 离散数学                     │
└──────────────────────────────────┴─────────────────────────────┘

大学知识库模板横向轨：离散数学、线性代数、数据库、编译原理、软件工程……
```

### 10.3 组件

```text
src/features/library/pages/LibraryHomePage.tsx
src/features/library/components/PrimaryLibrary.tsx
src/features/library/components/OwnedLibraryList.tsx
src/features/library/components/LibraryGraphThumbnail.tsx
src/features/library/components/UniversityTemplateRail.tsx
src/features/library/components/LibraryFilters.tsx
```

`LibraryGraphThumbnail` 使用纯 Canvas 2D 或 SVG 静态缩略图，不创建额外 WebGLRenderer。

## 11. 创建知识库 `/library/new`

### 11.1 核心流程

```text
命名与来源
  -> AI 解析预览
  -> 编辑节点和关系
  -> 生成教学结构
  -> 生成题目
  -> 预览并保存
```

顶部不写“步骤 1”，而是直接显示当前任务名称：

```text
来源   结构   教学   题目   预览
```

### 11.2 静态模拟方式

- 粘贴文本：根据关键词从预置解析结果库中选择最接近的知识结构。
- 上传文件：接受文件名和类型，但不读取上传内容；显示“本地演示解析”。
- 选择模板：直接载入预置知识库草稿。
- AI 解析等待：固定种子产生 420 - 760 ms 延迟，避免每次完全一致。
- 保存：写入 `localStorage`，刷新后仍然存在。
- 每个自定义知识库根据标题哈希生成稳定 ID、节点位置和默认主题。

### 11.3 页面布局

桌面端：

- 顶部 56 px 任务栏：返回、知识库名称、保存状态、预览、保存。
- 左侧 260 px：来源、结构、教学、题目、预览五个任务入口。
- 中间主编辑区：根据任务显示内容。
- 右侧 320 px：AI 解析结果、错误检查和下一步建议。

移动端：

- 每次只显示一个任务页面。
- 底部固定“上一步 / 下一步”。
- 右侧建议区改为可展开底部 Sheet。

### 11.4 组件树

```text
src/features/library-builder/pages/LibraryBuilderPage.tsx
src/features/library-builder/components/BuilderTopBar.tsx
src/features/library-builder/components/BuilderTaskRail.tsx
src/features/library-builder/components/SourceStep.tsx
src/features/library-builder/components/ParsePreviewStep.tsx
src/features/library-builder/components/GraphEditorStep.tsx
src/features/library-builder/components/TeachingSchemaStep.tsx
src/features/library-builder/components/QuestionGenerationStep.tsx
src/features/library-builder/components/PublishPreviewStep.tsx
src/features/library-builder/components/BuilderInspector.tsx
src/features/library-builder/components/GraphCanvas2D.tsx
src/features/library-builder/components/GraphPreview3D.tsx
```

### 11.5 节点编辑器

第一版不引入大型图编辑器库，使用现有 Graphology + SVG/Canvas 2D：

- 拖动节点改变 `x/y`。
- 单击节点在右侧编辑名称、类型和说明。
- 从节点连接柄拖到另一节点创建关系。
- 关系类型：包含、前置、相关、练习对应。
- 支持撤销、重做、搜索和自动布局。
- 预置知识库最多显示 180 个可编辑节点；更大知识库先按模块折叠。

Anime.js 只负责“解析完成后，节点从来源段落重排为图结构”的一次性组装动画：

- 在 `createScope()` 中使用 Anime.js V4 的 `animate`、`stagger` 和 timeline API。
- 只控制 GraphCanvas2D 内节点的 `translateX`、`translateY` 和 `opacity`。
- 动画结束后清理内联 transform，把最终位置交回编辑器状态。
- 不与 Motion 或 GSAP 控制同一节点。
- 该路由动态导入 `animejs`，不进入知识空间首包。

## 12. 知识库详情 `/library/:libraryId`

### 12.1 页面结构

- 顶部：知识库名称、说明、节点数、关系数、教学单元数、题目数。
- 主区域：左侧宽幅关系预览，右侧最近编辑和覆盖缺口。
- 下方使用四个标签：知识结构、教学单元、题目、来源。
- 每个列表支持搜索和筛选，但不做数据表格墙。

### 12.2 教学覆盖检查

每个知识节点必须能显示：

- 是否有解释
- 是否有示例
- 是否有诊断题
- 是否有引导练习
- 是否有独立检查
- 是否有常见误区和补救讲解

点击缺口可直接进入相应生成步骤。

## 13. 学习记录 `/progress`

### 13.1 页面职责

展示“系统为什么认为你掌握或未掌握”，不展示虚假的效率数字。

### 13.2 结构

- 顶部一句总结：本周完成的教学、练习和需要复教的知识。
- 中间是按时间排列的学习证据流。
- 右侧为掌握度变化最明显的知识节点。
- 底部为误区分布和下一轮教学安排。

禁止使用大面积填充进度条。掌握度用数字、证据数量、微型刻度和节点颜色表达。

## 14. 数据模型

### 14.1 KnowledgeBase

```ts
interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  domain: string;
  ownerType: 'system' | 'user';
  nodeIds: string[];
  edgeIds: string[];
  sourceIds: string[];
  teachingUnitIds: string[];
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 14.2 TeachingUnit

```ts
interface TeachingUnit {
  id: string;
  nodeId: string;
  title: string;
  objective: string;
  prerequisiteNodeIds: string[];
  stepIds: string[];
  misconceptionIds: string[];
  diagnosticQuestionIds: string[];
  independentCheckQuestionIds: string[];
  estimatedMinutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}
```

### 14.3 TeachingStep

```ts
interface TeachingStep {
  id: string;
  unitId: string;
  kind: TeachingStepKind;
  title: string;
  bodyBlocks: TeachingContentBlock[];
  questionIds?: string[];
  nextRules: TeachingNextRule[];
}
```

### 14.4 Question

```ts
interface Question {
  id: string;
  blueprintId: string;
  variantSeed: number;
  nodeIds: string[];
  type: QuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  stem: string;
  options?: QuestionOption[];
  answer: QuestionAnswer;
  explanation: string;
  misconceptionByAnswer: Record<string, string>;
  remediationUnitId?: string;
  sourceLabel: string;
}
```

### 14.5 学习证据

```ts
interface EvidenceRecord {
  id: string;
  learnerId: string;
  nodeId: string;
  source: 'diagnostic' | 'guided-practice' | 'independent-check' | 'practice';
  result: 'correct' | 'partial' | 'incorrect';
  misconceptionId?: string;
  weight: number;
  createdAt: string;
}

interface MasteryState {
  nodeId: string;
  level: 0 | 1 | 2 | 3 | 4;
  confidence: number;
  evidenceIds: string[];
  lastReviewedAt?: string;
  nextReviewAt?: string;
}
```

## 15. 静态虚拟数据规模

目标不是手写几千份重复 JSON，而是“高质量蓝图 + 稳定变式生成 + 深度打磨的评委主路径”。

### 15.1 知识图谱

- 现有计算机节点：336。
- 现有关系：646。
- 新增大学课程模板：48 个知识库。
- 每个模板：48 - 180 个节点。
- 模板总节点实例：约 4,800 个，仅在进入对应知识库时按需生成。

### 15.2 教学内容

- 每个现有节点生成 1 个基础教学单元：336 个。
- 每个单元至少 8 个教学步骤。
- 每个单元包含 3 种解释：直觉、正式、考试或工程应用。
- 每个单元包含 2 个教师示范、3 个诊断题、4 个引导练习、3 个常见误区和 2 条补救分支。
- 预计可见教学内容块超过 5,000 个。
- 深度手写 32 个评委常见演示节点，其余由内容模板稳定生成。

深度手写节点至少包括：

```text
线性表、树、图、进程与线程、虚拟内存、死锁、TCP、HTTP、缓存、
监督学习、神经网络、Transformer、RAG、向量数据库、模型部署、
游戏循环、矩阵变换、碰撞检测、ECS、渲染管线、
事件循环、React 状态、浏览器渲染、Web 性能
```

### 15.3 题库

- 480 个高质量题目蓝图。
- 每个蓝图生成 8 个固定种子变式，共 3,840 道题。
- 336 道节点前置诊断题。
- 160 道针对常见误区的补救题。
- 24 套完整模拟试卷，每套 40 题，共 960 个试卷题位。
- 题库页面可索引题目实例不少于 4,336 道。

题目分布：

- 408：1,600 道。
- AI 工程：800 道。
- 游戏开发：600 道。
- 前端开发：600 道。
- 大学扩展课程：至少 736 道。

### 15.4 演示学习记录

- 24 个学习者画像。
- 默认画像含 90 天学习时间线。
- 预置 1,200 条答题记录。
- 预置 380 条教学证据。
- 预置 96 条误区记录。
- 预置 28 个待复教任务。

所有数字必须在界面标记为“演示数据”，不能冒充真实用户统计。

## 16. 静态数据生成架构

### 16.1 文件结构

```text
src/data/v6/
  catalogs/
    knowledgeBaseCatalog.ts
    teachingCatalog.ts
    questionBlueprintCatalog.ts
    misconceptionCatalog.ts
    learnerProfileCatalog.ts
  handcrafted/
    teachingUnits408.ts
    teachingUnitsAI.ts
    teachingUnitsGame.ts
    teachingUnitsFrontend.ts
    judgeDemoQuestions.ts
  generators/
    seededRandom.ts
    generateKnowledgeBase.ts
    generateTeachingUnit.ts
    generateQuestionVariants.ts
    generateDemoHistory.ts
  generated/
    manifest.ts
  schemas/
    knowledgeBaseSchema.ts
    teachingSchema.ts
    questionSchema.ts
    progressSchema.ts
```

### 16.2 生成规则

- 所有生成器使用固定种子，刷新页面后数据不改变。
- 生成器只组合经过人工审查的句子块，不现场生成无意义文案。
- 变式只替换可验证参数，例如数组长度、时间片、窗口大小和代码输入。
- 正确答案和解析由同一纯函数产生，避免题干与答案不一致。
- 构建阶段运行 Zod 校验，发现孤立节点、无答案题目或无下一步教学规则时直接失败。
- 运行时按知识库和教学单元懒加载，不一次性解析全部 JSON。

## 17. 状态架构

### 17.1 Store 拆分

```text
src/store/userStore.ts
  用户画像、当前目标、演示重置

src/store/universeStore.ts
  节点选择、悬停、相机、关系模式、画质

src/store/libraryStore.ts
  知识库列表、当前草稿、保存状态

src/store/teachingStore.ts
  当前教学会话、步骤、回答、决策和补救分支

src/store/practiceStore.ts
  题目会话、答案、标记、计时和结果

src/store/progressStore.ts
  EvidenceRecord、MasteryState、MisconceptionRecord

src/store/uiStore.ts
  全局搜索、移动菜单、Toast、当前 Sheet
```

### 17.2 状态唯一来源

- 知识图谱原始数据只属于 repository，不复制到 store。
- 当前掌握状态只属于 `progressStore`。
- 教学步骤跳转只属于 `teachingStore`。
- 题目提交结果只属于 `practiceStore`，再通过动作写入 `progressStore`。
- 组件不得直接写 `localStorage`，统一经 `persistence` 服务。

### 17.3 持久化

```text
src/services/persistence/demoPersistence.ts
```

本地键统一前缀：

```text
iteach:v6:user
iteach:v6:libraries
iteach:v6:teaching
iteach:v6:practice
iteach:v6:progress
```

每个对象包含 `schemaVersion: 6`。解析失败时只重置损坏的域，不清空全部数据。

## 18. 本地 AI 教学模拟器

### 18.1 文件结构

```text
src/ai/teaching/TeachingDecisionEngine.ts
src/ai/teaching/explanationSelector.ts
src/ai/teaching/misconceptionMatcher.ts
src/ai/library/LocalLibraryParser.ts
src/ai/library/libraryTemplateMatcher.ts
src/ai/practice/PracticePlanner.ts
src/ai/shared/simulatedLatency.ts
```

### 18.2 接口保持未来可替换

```ts
interface TeachingAIService {
  chooseNextStep(input: TeachingDecisionInput): Promise<TeachingDecision>;
  explainNode(input: ExplainNodeInput): Promise<StructuredExplanation>;
  diagnoseAnswer(input: DiagnoseAnswerInput): Promise<AnswerDiagnosis>;
}

interface KnowledgeBaseAIService {
  parseSources(input: ParseSourceInput): Promise<KnowledgeBaseDraft>;
  generateTeachingCoverage(input: CoverageInput): Promise<TeachingCoverage>;
  generateQuestionSet(input: QuestionGenerationInput): Promise<QuestionSet>;
}
```

第一版实现为 Local Service。未来接真实 OpenAI Compatible API 时只更换 provider，不改变页面和 store。

## 19. 视觉系统

### 19.1 色彩

全产品只使用一套中性黑色基础：

```css
:root {
  --it-bg: #050606;
  --it-bg-deep: #020303;
  --it-surface: #0c0e0e;
  --it-surface-raised: #111414;
  --it-surface-hover: #171b1a;
  --it-text: #f0efe9;
  --it-text-soft: #a7aaa2;
  --it-text-faint: #6b716b;
  --it-rule: rgb(240 239 233 / 0.12);
  --it-rule-strong: rgb(240 239 233 / 0.22);
  --it-focus: #fff8dc;
  --it-accent: #d7b86a;
  --it-success: #83b99c;
  --it-danger: #df8b7d;
}
```

知识域颜色只出现在节点、关系、知识库缩略图和小型语义标记中。普通按钮不按模块换色。

### 19.2 材质

- 页面主体使用平面和留白，不使用大面积磨砂玻璃。
- 浮层背景不透明度至少 0.94，保证文字可读。
- 卡片只用于具有独立身份的对象，例如当前教学任务或知识库。
- 长列表优先用分组、标签、横向轨或紧凑行，不在每行套卡片。
- 圆角规则：按钮 7 px，输入框 7 px，面板 10 px，只有头像和状态可用圆形。

### 19.3 文字

- 页面标题：28 - 36 px，600。
- 教学舞台标题：30 - 42 px，560。
- 面板标题：18 - 22 px，560。
- 正文：14 - 16 px，1.6 行高。
- 元数据：11 - 12 px，Geist Mono。
- 不使用衬线字体，不使用渐变文字，不使用全部大写的装饰小标题。

## 20. 十个指定资源库的精确落点

### 20.1 Taste Skill

用途：设计读取、三项旋钮、反模板化检查、动效动机和最终预检。

落点：

- `docs/design/ITEACH_DESIGN.md`
- 每个页面 PR 的视觉验收清单
- 仅用于规范，不进入运行时 bundle

### 20.2 Impeccable

用途：检测常见 AI 设计痕迹、建立层级、材质、间距和状态的确定性审查。

落点：

- `docs/design/visual-audit-checklist.md`
- `src/design/tokens.css`
- 施工完成后的浏览器截图审计

只借鉴“平面材质、细线、有限纹理预算、语义色有意义”等规则，不复制金箔品牌风格。

### 20.3 UI UX Pro Max

用途：响应式、可访问性、Three.js 性能和组件状态校验。

落点：

- `src/performance/qualityPolicy.ts`
- `src/scene/*`
- `src/design/responsive.ts`
- `tests/accessibility/*`

重点采用：单 WebGL Renderer、DPR 预算、BufferGeometry/Points、ResizeObserver、触控输入、动态 reduced motion。

### 20.4 Awesome DESIGN.md

用途：从 Apple、Linear、Claude、Runway 的分析中提取而不混搭品牌。

提取规则：

- Apple：产品优先、界面 chrome 后退、字级和留白纪律。
- Linear：近黑表面、细边界、技术内容的紧凑阅读。
- Claude：教学文案的人性化、解释层级和清晰的输入反馈。
- Runway：媒体舞台和工具区的空间比例。

落点：`docs/design/ITEACH_DESIGN.md`，形成一套 iTeach 自有 token，不直接复制任何品牌色和字体。

### 20.5 GSAP

用途：需要严格编排的复杂序列。

只使用在：

- 教学步骤内容编排。
- 知识空间进入教学的单次交接。
- 大型知识库预览的镜头过渡。

不使用在普通按钮、标签切换、抽屉和列表进入。

### 20.6 GSAP Skills

用途：约束 GSAP 的 React 生命周期和性能实现。

强制规则：

- 使用 `useGSAP({ scope })`。
- 延迟事件使用 `contextSafe()`。
- 只动画 transform 和 opacity。
- 高频输入使用 `quickTo()`。
- 页面隐藏或路由离开时暂停或销毁动画。
- 不创建数百个重叠 tween。

### 20.7 Inspira UI

该仓库是 Vue/Nuxt 组件，不直接复制到 React。只移植交互模式：

1. `AnimatedTabs` -> `PracticeModeTabs` 和知识库详情标签，使用 Motion `layoutId` 重写。
2. `AnimatedBeam` -> `TeachingRelationBeam`，使用 ResizeObserver 计算教学内容间的二次贝塞尔连接，状态变化时播放一次。
3. `BlurReveal` -> `TeachingContentReveal`，模糊最大 8 px，只在教学内容第一次出现时使用。

禁止移植 Dock 到主导航，因为主产品导航需要稳定而非放大漂移。

### 20.8 Motion

用途：DOM 状态变化和布局过渡。

只使用在：

- 路由淡入淡出。
- 标签 `layoutId`。
- 面板展开、折叠和移动端 Sheet。
- 列表重排和问题反馈区域扩展。

Motion 不控制 Three.js 对象，也不控制 GSAP 已接管的教学舞台节点。

### 20.9 Lottie Web

用途：唯一的一次性掌握确认动画。

落点：

- `src/features/practice/components/MasteryConfirmedAnimation.tsx`
- `public/lottie/mastery-confirmed.json`

按路由动态导入，播放一次后销毁实例。

### 20.10 Anime.js

用途：自定义知识库解析完成后的二维节点组装。

落点：

- `src/features/library-builder/animation/assembleParsedGraph.ts`

按路由动态导入，只操作 GraphCanvas2D 内元素，结束后交回状态管理。

### 20.11 动画库冲突总规则

```text
Three/R3F：三维场景每帧渲染
GSAP：教学序列和复杂可控编排
Motion：React DOM 布局和状态过渡
Anime.js：知识库编辑器的一次性二维组装
Lottie：结果页单次矢量动画
CSS：hover、focus、active 和简单 180 ms 反馈
```

一个 DOM 元素只能由其中一种运行时动画工具控制。

## 21. 完整文件结构

```text
src/
  app/
    AppRouter.tsx
    AppShell.tsx
    RouteTransition.tsx
    routes.ts
  ai/
    teaching/
    library/
    practice/
    shared/
  components/
    navigation/
    search/
    feedback/
    primitives/
  data/
    knowledgeGraph.ts
    v6/
      catalogs/
      handcrafted/
      generators/
      generated/
      schemas/
  design/
    tokens.css
    typography.css
    responsive.ts
    motion.ts
  features/
    universe/
      pages/
      components/
    teaching/
      pages/
      components/
      animation/
    practice/
      pages/
      components/
    library/
      pages/
      components/
    library-builder/
      pages/
      components/
      animation/
    progress/
      pages/
      components/
  graph/
  performance/
  scene/
  services/
    persistence/
  store/
  tests/
    data/
    teaching/
    practice/
    persistence/
    accessibility/
```

## 22. 性能预算

### 22.1 分包目标

- App Shell + 知识空间 DOM：gzip 小于 150 KB，不含 Three.js。
- Three/R3F 独立 chunk，只在知识空间和三维预览加载。
- GSAP 教学 chunk 只在教学会话加载。
- Anime.js 只在知识库编辑器结构步骤加载。
- Lottie player 和 JSON 只在结果页加载。
- 题库蓝图按方向分包，不把 4,336 道题一次放入内存。

### 22.2 WebGL

- 全应用同时最多一个 WebGLRenderer。
- 离开 `/universe` 后暂停 render loop，使用 `frameloop="demand"` 或卸载 Canvas。
- 自定义知识库三维预览打开前先卸载或复用知识空间 renderer。
- DPR 继续遵守当前像素预算。
- Windows 自动档默认关闭 Bloom，节点亮度通过材质和核心尺寸保证。

### 22.3 DOM

- 题目列表和知识库节点列表超过 100 项时使用虚拟化或分段渲染。
- 不为 4,336 道题创建 DOM，只加载当前会话和下一小段缓存。
- 动画只使用 transform 和 opacity。
- ResizeObserver 必须在卸载时 disconnect。

## 23. 可访问性

- 全部功能支持键盘完成。
- 教学步骤轨使用 `nav` 和 `aria-current="step"`。
- 题目选项使用原生 radio/checkbox 语义。
- Canvas 提供同等的文本节点列表和描述。
- 颜色不是唯一状态表达，配合文字和图标。
- `prefers-reduced-motion` 会实时响应系统变化。
- 触控目标不小于 44 x 44 px。
- 正文和按钮至少满足 WCAG AA。
- 教学和刷题提交后使用 `aria-live="polite"` 宣布结果。

## 24. 施工顺序

### 批次一：应用骨架

1. 安装 `react-router-dom`、`animejs`、`lottie-web`。
2. 创建 `AppRouter`、`AppShell` 和全局导航。
3. 把现有知识空间迁移到 `/universe`，保证功能完全不回退。
4. 建立路由级 lazy loading。
5. 运行 typecheck、单元测试、构建和四种断点截图。

终止条件：四个一级入口可访问，知识空间行为与 V5 一致，三维包未进入其他页面首屏。

### 批次二：数据基础

1. 创建 V6 schema 和 Zod 校验。
2. 创建固定种子生成器。
3. 生成知识库、教学、题库和学习记录 manifest。
4. 建立 repository 和 persistence。
5. 为生成器写确定性、答案一致性和孤立关系测试。

终止条件：同一 seed 每次输出一致；4,336 道题均可校验；不存在无答案题和无下一步规则的教学步骤。

### 批次三：教学系统

1. 完成教学首页。
2. 完成三栏教学会话。
3. 完成八类教学步骤。
4. 完成静态决策引擎和补救分支。
5. 接入 GSAP 教学序列和关系光束。

终止条件：从“进程与线程”开始，至少能经历诊断、错误、补救、独立检查和掌握确认的完整闭环。

### 批次四：刷题系统

1. 完成刷题首页和四种入口。
2. 完成一题一屏会话。
3. 完成至少四种主展示题型。
4. 接入错因、补救教学和掌握度回写。
5. 接入一次性 Lottie 掌握动画。

终止条件：回答错误会改变教学安排；回答正确会写入学习证据；刷新后记录仍存在。

### 批次五：知识库系统

1. 完成知识库首页和详情。
2. 完成五任务创建流程。
3. 完成二维节点关系编辑。
4. 完成 Anime.js 解析组装动画。
5. 完成本地保存、重新打开和三维预览。

终止条件：评委能创建“数据库系统”知识库，看到解析后的节点，修改关系，生成教学和题目，保存后在知识库首页重新打开。

### 批次六：学习记录与总联调

1. 完成证据流和误区记录。
2. 打通四个模块跳转。
3. 完成全局搜索。
4. 完成演示数据重置。
5. 完成 Windows、Mac、移动端和 reduced-motion 测试。

终止条件：评委体验路径完整，任何一步刷新都不会丢失本地演示状态。

## 25. 比赛评委 8 分钟演示路线

```text
00:00 进入知识空间，拖动、缩放并点击“进程与线程”
00:45 上下游知识链点亮，右侧显示该节点掌握证据
01:20 点击“开始教学”
01:35 完成两道前置诊断，其中一道故意选错
02:20 系统识别“共享资源边界”误区并切换补救讲解
03:10 完成引导练习，看到教学判断更新
04:00 进入刷题，完成一道代码跟踪题
04:50 错题反馈点亮对应前置节点，并可回到补救教学
05:30 进入知识库，创建“数据库事务”自定义知识库
06:20 查看 AI 解析的节点组装动画，修改一个关系
07:00 生成教学单元和题目，保存知识库
07:35 打开学习记录，看到所有操作成为教学证据
08:00 回到知识空间，查看掌握状态和推荐路径变化
```

## 26. 验收标准

### 26.1 产品闭环

- 知识空间、教学、刷题、知识库和学习记录全部可访问。
- 从任意知识节点可开始教学或练习。
- 教学会根据回答走不同分支。
- 错题会生成误区和补救任务。
- 教学与刷题会更新掌握状态并反馈到知识空间。
- 自定义知识库可创建、修改、保存和重新打开。

### 26.2 数据

- 至少 48 个知识库模板。
- 至少 336 个教学单元。
- 至少 4,336 道可索引题目。
- 至少 32 个深度手写演示教学节点。
- 所有题目有答案、解析、知识节点和错因映射。

### 26.3 视觉

- 没有 AI 紫色渐变、三等宽卡片墙和大面积玻璃。
- 页面名称与按钮文案直接、正常、可理解。
- 右侧信息区位置稳定。
- 动画均能解释其教学含义。
- 全产品保持同一黑色设计系统。

### 26.4 性能

- Windows 核显在知识空间自动档常规探索中位帧率不低于 45 FPS。
- 非三维页面不持续运行 WebGL render loop。
- 页面切换 INP 目标小于 200 ms。
- 首次进入非三维页面不加载 Anime.js、Lottie 和 Three.js。
- 不出现内存持续增长的动画和 ResizeObserver。

### 26.5 工程

- `npm run typecheck` 通过。
- `npm test` 通过。
- `npm run build` 通过。
- Playwright 覆盖评委主路径。
- 360、768、1024、1440 和 1920 宽度无水平溢出。
- reduced-motion、键盘和触控流程可用。

## 27. 风险与控制

### 风险一：静态内容很多但质量重复

控制：32 个深度手写主节点作为比赛主路径；其他内容由经过审查的教学模板生成，界面不声称全部为 AI 即时创作。

### 风险二：动画库过多导致体积和冲突

控制：每个库有独立路由和独立元素所有权；全部动态导入；一个元素只允许一个动画运行时。

### 风险三：知识库编辑器范围失控

控制：第一版只做单人、本地、二维节点关系编辑和确定性解析，不做实时协作、真实文件解析和云端发布。

### 风险四：多页面削弱三维作品记忆点

控制：知识空间仍是默认入口；所有教学与刷题反馈都能回到图谱；普通页面使用关系线、节点缩略图和教学证据保持同一产品语法。

### 风险五：看起来像后台管理系统

控制：每个页面围绕一个当前任务组织，不堆指标卡；教学页是一块教学舞台，刷题页是一题一屏，知识库页以关系预览为主。

## 28. 最终冻结决策

1. iTeach 的核心从“AI 导航知识”升级为“AI 根据证据实施教学”。
2. 三维知识空间不删除，但从唯一页面变成产品的知识地图和反馈入口。
3. 教学系统优先于额外视觉特效，是下一轮施工的第一功能模块。
4. 大量静态数据采用高质量蓝图加固定种子变式，不手写数千份重复 JSON。
5. 十个指定资源库全部有明确职责，但只有动画运行库进入各自按需 chunk。
6. 所有数据和 AI 行为在比赛版中可离线运行、可重置、可重复演示。
