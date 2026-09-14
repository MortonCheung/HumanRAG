# HumanRAG V11 Final 执行与验收

完整需求：[施工方案](humanrag-v11-final-spec.txt)。当前状态：V11 Final 已完成本地施工与验收；分支未合并、未推送、未部署。Windows、Safari 与真实触屏设备仍需实机验收。

## 基线与保护

- 指定基线 `71d4a23c16e9a02d1380f528d44a75ba565a8676` 是当前 HEAD 的祖先。
- 开始时工作区干净，HEAD `802a92d`，在指定基线上另有五个已提交改进。
- 本地 `main` 仍在 `c9efb87`，不能按示例切回 main 覆盖既有成果。
- 从 `802a92d` 建立 `feat/v11-humanrag-competition-final`，保留全部既有改动；不合并、不推送。
- `npm install` 完成，无依赖升级；原依赖审计报告两项 moderate，不执行破坏性自动升级。
- 基线门禁日志：`output/v11-final/baseline-{typecheck,unit,build,e2e}.log`。

## 执行计划

每批按照“核实现状 → 最小复用实现 → 类型/单测/生产构建 → 用户路径 E2E → 独立提交”推进。上一批未绿不进入下一批。已存在的正确实现复用，并用行为验收核实。

| 批次 | 范围 | 核心验收 | 状态 |
| --- | --- | --- | --- |
| 0 | 冻结基线、保护工作区、完整门禁 | 记录测试数量/失败/构建大小 | 完成 |
| 1 | Motion tokens、常驻导航、删除 skip/性能废文案 | 共用节奏，隐藏导航不可聚焦，桌面操作常驻 | 完成 |
| 2 | 持久 SpatialStageCanvas、Scene 抽取、Router 扩展 | 四类空间路由共用 Canvas/WebGL context | 完成 |
| 3 | 真实连通星座、苏醒传播、导航 settling | 原节点原关系，稳定 preset，约两秒进入 | 完成 |
| 4 | Synaptic Pulse | 沿真实边亮度波，交互继续，按设备降级 | 完成 |
| 5 | Registry composer、通用 createTree、用户树题库 | 自然语言选既有节点，普通 KnowledgeTree，事务校验 | 完成 |
| 6 | 抽取高亮、断边、退场、正式布局聚合、建边 | 不修改 canonical 图，visualReady/treeReady 双门 | 完成 |
| 7 | Library 连续预览空间、相机切树、CTA/文案 | 所有树稳定 anchor、缓慢旋转、同 Canvas | 完成 |
| 8 | Universe → Library 交接 | 同树布局/材质/相机/旋转相位，新树选中 | 完成 |
| 9 | Tree 持久工作区、Path/Verify、旧路由重定向 | 面板切换场景不刷新，预览平滑停转 | 完成 |
| 10 | 折叠目录、统一节点操作 | 当前/推荐/搜索组可达，键盘可操作 | 完成 |
| 11 | Study、Teach、Train/Verify/Exam | 用户自主研究/教学决策/独立测量真正分开 | 完成 |
| 12 | Evidence、统一 Recommendation、图谱状态 | 提示/重复题不算掌握，新独立证据改变建议 | 完成 |
| 13 | 逐页去卡片/文案、排版、响应式 | 1440×900、768×1024、390×844，无横向溢出 | 完成 |
| 14 | 完整比赛链、回归、截图、交付文档 | 408→网络→TCP→失败→补救→新验证→证据反馈 | 完成 |

## 实施边界

- 不新增聊天机器人、第二套 AI 树或虚构知识/来源。
- 保留现有内容仓库、TCP 决策引擎、真实证据推导和有效视区设施。
- 普通 Goal focus 只改变相关性；只有建树转场改变显示位置。
- 自动与手动创建共用事务；失败保留输入，恢复 Universe，不演完空树。
- 动画低动态路径与常规路径共用数据逻辑。
- 浏览器软件渲染检查不能代替 Windows/Safari/真机 GPU 性能；未实测项目明确保留。

## 批次结果

- Batch 0：`typecheck` 通过；32 个文件、177 项单测通过；生产构建通过，最大空间 chunk 1,091.51 kB（gzip 302.10 kB）；25 项 E2E 全部通过。已有 Lottie eval 警告。日志在 `output/v11-final/`，该目录不纳入版本控制。
- Batch 1：新增统一 Motion/GSAP 时间与缓动基线；导航在开场第一帧挂载并于后段短距离 settle，隐藏状态保持 inert；删除 Esc/按钮跳过入口；性能设置仅保留四档选择。类型检查、177 项单测、生产构建，以及开场/导航/评委流程 9 项 E2E 通过。
- Batch 2：`SpatialStageCanvas` 成为 `/`、`/universe`、`/library` 和知识树使用态唯一 Canvas；旧独立 Universe Canvas 删除，Library/Tree DOM 只定义舞台窗口与面板。正式树布局从 Universe 坐标中分离，Library→Tree 保留同一场景对象并由共享 CameraControls 改变 framing。新增 Canvas DOM identity E2E；类型检查、177 项单测、生产构建及相关 4 项 E2E 通过，并人工查看 Library/Tree 桌面截图。
- Batch 3：Opening 状态改为 `intro → awakening → settling → universe`；首次进入随机选一个稳定构图 preset，从 408 真实关系中 BFS 选择连通子图。点击后沿真实图距离为边与节点分配传播延迟，边从端点生长，节点在信号到达后显现，原星座节点向 canonical Universe 坐标收束；Camera 1.92 秒快速建立运动并柔和收尾，导航在 settling 阶段短距离落下。新增 4 项连通性/传播单测；33 文件、181 项单测、构建和 7 项相关 E2E 通过，人工查看 1440 Opening 与最终 Universe。
- Batch 4：脉冲继续由同一 batched edge shader 计算亮度波峰，并与苏醒期边生长共享属性；按高/均衡/低档稳定限制为 16/9/5 条活跃脉冲，idle 刷新为 30/24/18fps，Camera 手势不冻结时钟。删除自定义树 Canvas 的移动球形 signal。类型检查、33 文件/184 项单测、构建和空间交互 E2E 通过。
- Batch 5：目标面板收口为单一自然语言输入；`GoalTreeComposer` 从 Registry 的名称、标签、描述与内容线索确定性评分，并沿前置、层级、关联和练习关系传播、补连接节点，输出 8–36 个已有节点及逐点理由。手动与自动创建共用带 pointIds 校验和成员推导的 `createTree` 事务，PracticePlanner 按任意 KnowledgeTree 的 pointIds 聚合内容仓库题目。类型检查、35 文件/190 项单测、生产构建和 5 项相关 E2E 通过；浏览器验证“目标 → 新个人树 → 整树练习”完整可达。
- Batch 6：新增独立抽取状态机与 treeReady/visualReady 双就绪门。相关节点先增强，旧 Universe 边通过 Shader 从中心向端点断开，无关节点只在表现层向深处退场；选中节点从 canonical 坐标聚合到 `layoutCustomTree` 与 `customTreeFrame` 产生的正式预览位置，新关系由两个端点向中间生长。抽取期间同一 Camera 进入正式树 framing，低动态路径改为约 310ms 的即时状态变化。类型检查、37 文件/195 项单测、生产构建与 6 项相关 E2E 通过；人工检查正常动态的退场、聚合、双端建边和相机收束截图，Canvas 在 URL 交接前后保持同一实例。
- Batch 7：Library 改为常驻树预览宇宙，所有知识树按持久顺序挂在稳定 anchor 上并使用稳定相位慢速旋转；切换选择只让共享相机在树间移动。预览按真实舞台裁切，主操作收口为“进入知识树”，创建与库级能力验证为次操作。类型检查、197 项单测、生产构建和相关浏览器回归通过，并检查桌面与移动取景。
- Batch 8：目标抽取的最终布局、边几何和 Library 预览改为同一套实现；交接时冻结新树相位，以当前相机位姿进入 Library，再恢复稳定慢速旋转。变换层级固定为 anchor、rotation、layout offset，避免旋转中心漂移。类型检查、198 项单测、生产构建和 5 项相关 E2E 通过，逐帧截图确认节点、连线与相机连续。
- Batch 9：删除总览、学习页、题库页及第二套正式树场景；知识树规范路由收口为 `/path` 与 `/verify`，旧 `/learn`、`/practice` 仅重定向。Library 与 Tree 复用同一批三维树对象和相机控制器，进入时在 0.45 秒内按 `power2.out` 减速停转并切到正式取景；左侧树持续存在，右侧在学习路径、能力验证和节点详情间替换。桌面、平板与 390px 手机各五轮往返验证 Canvas 和树宇宙实例不变、范围不缩小、无横向溢出；类型检查、196 项单测、生产构建及 8 项相关 E2E 通过。
- Batch 10：学习路径与能力验证目录改为可折叠分组，默认只展开统一推荐所在组；节点选择和搜索结果会自动展开对应组，节点详情覆盖右栏时保留目录、搜索词与展开状态。节点入口统一为同级的“自主学习 / 带我学 / 验证掌握”，并建立 `/study`、`/teach`、`/verify` 规范路由，旧节点路由继续兼容。类型检查、39 文件/201 项单测、生产构建与全部 27 项 E2E 通过；人工检查折叠目录、TCP 搜索定位、三维节点同步高亮和动作面板。
- Batch 11：`/study`、`/teach` 和 `/verify` 分成三种真实工作流。自主学习提供结构化材料与可操作观察；带我学继续由确定性教学决策引擎根据实际误区选择内容；训练即时反馈，验证和考试在结束后统一揭示，并只用未曝光题目形成独立证据。会话按学习者、范围和模式持久化，中途离开可恢复。
- Batch 12：新增统一 `deriveLearningState` 与 `{ pointId, score, reasons }` 推荐结果。Universe、知识树、学习路径、教学、练习和学习证据读取同一结论；提示、旧题重复正确与不完整题组不会得到“已独立验证”，同轮全新任务无帮助全对才会改变状态和后续建议。
- Batch 13：Node Inspector 保留外壳只替换内容，空间路由不再叠加网页滑动；视觉 token、文字层级、圆角和响应式收口。Study 增加本地问题账本，未解决问题进入原有统一推荐。TCP 材料补入真实 RFC 5681 §3.1 来源；删除无关统计和旧组件。
- Batch 14：Universe、Shader、GlobalNav 与 ExplorerInterface 在 Opening CTA 前挂载；自动建树在视觉形成期间同时预加载 Library 并准备 Tree runtime，失败会恢复完整 Universe、保留输入并允许重试。补齐自动树模型、Strong Evidence、Canvas 身份、Library 相机切树、Tree 面板切换、失败恢复、重置后再次生成和完整比赛链检查；修复 390px 验证页被桌面网格挤窄的问题。README、项目报告与 8 分钟演示手册同步到 V11。

## 视觉截图矩阵

- 桌面 1440 × 900：15 个规定画面全部由 `e2e/visual-acceptance.spec.ts` 复现，覆盖 Opening、苏醒中段、Universe、目标面板、抽取、Library、知识树、Study、Teach、Verify 和 Evidence。
- 移动端 390 × 844：9 个核心画面全部复现；截图回看发现并修复 Verify 双栏挤压，随后增加几何断言防止回归。
- 本地产物：`output/v11-final/visual-acceptance/`；总览图为 `desktop-contact-sheet.jpg` 与 `mobile-contact-sheet.jpg`。该目录是验收产物，不提交仓库。

## Motion 人工验收

本机 Chromium 软件渲染下逐项检查 Task 61：点击 Opening 后立即进入已有场景的苏醒过程；短交互动效节奏清楚；Camera 起步直接、结尾有缓和；导航在 settling 阶段落下，没有突然弹出；星座按真实图距离传播，线抵达后节点接续出现；Pulse 表现为边内亮度波，拖动 Camera 时继续；Inspector 切点只换内容；Library 切树保留 Canvas 并由相机移动；自动建树交接沿用同一布局、材质和相位，进入 Library 后继续旋转；Tree 内 Path、Verify 与 Node Detail 只换右侧面板。

自动检查锁定 Canvas DOM identity、场景实例 identity 与 Camera 数据变化；Shader 单测确认 Pulse 读取连续时间，拖动时继续发光由本轮人工检查确认。软件渲染无法证明真实 GPU 的帧时间；Windows、Safari 和触屏设备保留为部署前实机项。

## 最终门禁

- `npm run typecheck`：通过。
- `npm test -- --run`：41 个测试文件、214 项单元测试全部通过。
- `npm run build`：通过；最大 `spatial-runtime` chunk 为 1,091.51 kB（gzip 302.10 kB），保留 `lottie-web` 上游 `eval` 警告。
- `npm run test:e2e -- --workers=2`：38 项 Playwright E2E 全部通过，用时约 1.5 分钟。
- 完整比赛主链包含星座 Opening、原目标句、TCP 错答、互动示范、补救、全新 predict/observe 无提示验证、RFC 来源、Evidence 与个人树下一步不再推荐已验证的 TCP，以及知识树/Universe 状态同步。
