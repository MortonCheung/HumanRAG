# iTeach 大学知识神经空间 V3 设计基线

文档状态：参考研究已完成，作为下一版施工规范的上位约束  
更新时间：2026-08-25  
适用项目：`/Users/morton_cheung/Desktop/AI/iTeach`

> 本文回答的是“我们究竟在做什么，以及 Marble、Obsidian、Karpathy 各自贡献什么”。它不是对三个参考对象的外观拼贴，也不授权直接复制任何第三方数据或品牌资产。

---

## 1. 最终产品定义

iTeach 是一个面向大学生的、由目标驱动的三维学习导航系统。

它不把课程做成二维目录，不把 AI 做成聊天框，也不把知识图谱当作循环播放的视觉背景。系统维护一套经过人工策划、可以验证的大学计算机知识图谱，根据学生画像与目标选择恰当的局部知识上下文，再把 AI 的目标匹配、路径推荐和概念解释显式呈现在可探索的三维空间中。

用户进入产品后应理解三件事：

1. 我的目标需要哪些能力和课程。
2. 这些知识为什么相互关联，学习顺序是什么。
3. 我现在应该从哪个节点开始，接下来会走到哪里。

完整演示闭环固定为：

```text
创建大学生画像
→ 输入“计算机考研 408”等目标
→ AI 将目标匹配到知识图谱中的合法节点
→ 相关子图激活，无关内容保留但弱化
→ 镜头进入目标区域
→ 用户沿曲线路径探索课程与知识点
→ 点击节点查看局部关系与 AI 解释
→ 生成一条可追溯、可检查的学习路径
```

## 2. 三类参考对象的明确分工

### 2.1 Marble：课程知识如何被可靠建模

[Marble Skill Taxonomy](https://github.com/withmarbleapp/os-taxonomy) 是数据仓库，不是 Marble 三维网站的前端源码，也不是应安装进 iTeach 的运行时依赖。

可借鉴：

- 稳定、可长期引用的节点 ID。
- 结构化 JSON 与 JSON Schema。
- `hard` / `soft` 两种前置强度。
- 每条前置关系携带 `reason`，解释为什么依赖。
- `evidence` 表达“什么行为可以证明掌握”。
- `assessmentPrompt` 提供可检验的问题。
- 数据版本、manifest、checksum、来源与许可证记录。
- 基础知识库与个人用户状态分离。
- 点击节点同时回答“从哪里来”和“接下来去哪里”。

不可照搬：

- 小学课程内容与儿童化语言。
- 年龄作为空间高度。
- 八个基础教育学科的分类。
- 直接复制 1,590 个节点或课程标准文字。
- 将所有实体都建模为 `topic`。
- 用 `centrality` 直接替代个人目标相关度。
- 声称复用了未开源的 Marble 三维渲染实现。

大学版转换规则：

```text
Marble：学科 → 领域 → 年龄段 → 微知识点
iTeach：目标 → 方向 → 课程/技能 → 知识点 → 练习
```

Marble 的“年龄轴”替换为 iTeach 的“知识语义深度轴”；学期、难度、掌握度和推荐顺序作为独立属性，不与 Y 轴混用。

### 2.2 Obsidian：关系网络如何被人理解和探索

[Obsidian Graph View 官方说明](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Graph%20view.md)明确区分全局图和局部图：全局图展示整个知识库，局部图只展示当前节点附近的关系，并允许调整关系深度。

iTeach 采用以下交互原则：

- 初始全景对应 Global Graph：用户能感知整个大学知识空间的规模和领域分区。
- 选择目标后是目标投影图：保留完整图，但只强化与目标相关的子图。
- 点击节点后是 Local Graph：选中节点、一跳强关系和必要的二跳路径成为视觉主体。
- 悬停只做临时预览，点击才改变镜头和详情状态。
- 选中节点同时显示入边、出边、前置和后继，避免只有“附近节点”而没有关系语义。
- 节点大小主要表达类型与当前任务权重，中心性只允许作为细微辅助，不让热门节点吞噬层级结构。

iTeach 不复制 Obsidian 的随机力导向布局和图设置面板。比赛 Demo 使用确定性分层布局，刷新、切换目标和重复演示时节点位置必须稳定。

### 2.3 Karpathy：AI 如何成为知识层，而不是聊天装饰

[Karpathy 的 LLM Wiki 原始 Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)提出三层结构：不可变的原始资料、LLM 维护的编译知识层、规定工作流和结构的 Schema；并以 `ingest`、`query`、`lint` 维护一个持续累积的知识库。他把 Obsidian 视作 IDE、LLM 视作维护知识的程序员、Wiki 视作代码库。

对 iTeach 的直接启发：

- 知识不能每次提问时从原始材料临时拼接，而应先形成稳定、互相链接的知识层。
- AI 的价值是把来源、概念和用户目标编译成可追溯的局部上下文。
- 人负责课程真源、目标和判断；AI 负责解析、组织、解释和推荐。
- 有价值的解释未来可以进入个人知识层，让学习记录持续积累。
- 图谱健康检查应发现孤立节点、悬空边、冲突关系、过时描述和缺失来源。

[Karpathy 的 2025 LLM 回顾](https://karpathy.bearblog.dev/year-in-review-2025/)强调垂直 LLM 产品需要上下文工程、多次模型调用的内部编排、领域专用且可审查的 GUI，以及可调的人机自主程度。iTeach 的三维图谱正是领域 GUI：它让用户看见 AI 选择了哪些上下文、为什么推荐这条路径，并可以进入、退出或改选。

必须保持学术诚实：

- Karpathy 没有提出三维知识宇宙。
- Karpathy 没有提出大学五层学习图谱。
- Obsidian Graph 不等于个性化学习路径。
- 三维布局、目标驱动投影和教学层级是 iTeach 自己的产品设计。

推荐对外表述：

> iTeach 吸收了 Karpathy 关于持久知识库、上下文工程、领域专用 GUI 和人机验证循环的公开观点，将人工策划的学习图谱作为稳定真源，再把 AI 的目标匹配和路径建议显式呈现在可探索的三维空间中。

## 3. 产品边界

### 3.1 第一版必须是

- 大学生目标驱动的学习导航。
- 三维空间为主界面，占可视区域 90% 以上。
- 人工定义、结构化、可验证的知识图谱。
- AI 解析目标、解释节点、推荐合法路径。
- 用户可审查 AI 选择的节点和路径。
- 无远端模型时仍能通过本地规则完成完整演示。

### 3.2 第一版不是

- 聊天机器人。
- 普通课程平台或网课商城。
- 题库、学习打卡、积分或排行榜。
- Obsidian 插件或 Obsidian 同步服务。
- 自动爬取并改写正式课程的自治系统。
- 允许 AI 随意创建先修关系的公共知识库。
- 用发光球、星空粒子和 HUD 模拟“未来感”的演示动画。

## 4. 五层大学知识模型

### 4.1 节点类型

```ts
type NodeType =
  | 'goal'
  | 'direction'
  | 'skill'
  | 'course'
  | 'knowledge'
  | 'practice'

interface KnowledgeNode {
  id: string
  name: string
  type: NodeType
  layer: 0 | 1 | 2 | 3 | 4
  domain: string
  description: string
  learningOutcomes: string[]
  masteryEvidence: string[]
  assessmentPrompt?: string
  difficulty?: 1 | 2 | 3 | 4 | 5
  estimatedMinutes?: number
  resourceIds: string[]
  sourceIds: string[]
  canonicalPosition: [number, number, number]
}
```

层级与 Y 轴固定映射：

```text
Y =  20：goal
Y =  10：direction
Y =   0：course / skill
Y = -10：knowledge
Y = -20：practice
```

X/Z 由领域分区、父节点扇区和稳定哈希共同决定。布局可在目标激活时产生派生位置，但 `canonicalPosition` 永远不被用户状态修改。

### 4.2 关系类型

```ts
type RelationType =
  | 'contains'
  | 'prerequisite'
  | 'supports_goal'
  | 'assessed_by'
  | 'applied_in'
  | 'related_to'
  | 'equivalent_to'

interface KnowledgeEdge {
  id: string
  source: string
  target: string
  relationType: RelationType
  strength: 'hard' | 'soft'
  reason: string
  directed: boolean
  sourceIds: string[]
}
```

只有 `prerequisite` 子图必须是 DAG。`related_to` 和应用关系允许成环，否则无法表达真实知识关联。

### 4.3 状态不得混写

```text
CuratedKnowledgeGraph  静态真源：节点、边、来源、版本
UserProfile            用户专业、年级、身份、基础、兴趣
GoalSelection          原始目标文本、匹配结果、置信度
MasteryState           个人掌握度和学习记录
RecommendationState    目标相关度、推荐顺序、解释原因
SceneProjection        派生位置、透明度、尺寸、标签可见性
CameraState            相机意图和正在进行的过渡
```

不得把用户掌握度、推荐分数、派生位置或相机状态写回静态知识节点。

## 5. 目标驱动投影算法

输入：用户画像、自由文本目标、稳定知识图谱。  
输出：合法目标节点、相关节点分数、推荐路径和场景投影。

### 5.1 目标匹配

1. 文本标准化：统一空格、大小写、数字和常见别名。
2. 本地词典先匹配强关键词，例如 `408`、`考研`、`游戏开发`、`前端`、`AI 工程`。
3. 远端 AI 可返回候选，但只能引用已有节点 ID。
4. 返回 `matchedGoalId`、`confidence`、`reason` 和候选列表。
5. AI 请求失败、超时或返回非法 ID 时，自动回退本地匹配。

### 5.2 相关度

建议基础公式：

```text
relevance =
  0.34 × goalSupport
+ 0.24 × pathProximity
+ 0.18 × prerequisiteImportance
+ 0.14 × profileFit
+ 0.10 × currentMasteryNeed
```

所有分量归一化到 `0..1`。第一版允许根据数据质量微调权重，但不得用随机数影响结果。

### 5.3 派生视图

- `relevance ≥ 0.72`：激活，靠近目标区域，完整标签，主要曲线可见。
- `0.38 ≤ relevance < 0.72`：上下文，保持位置或轻微外移，只在靠近时显示标签。
- `relevance < 0.38`：背景，降低透明度并向外围移动，不删除、不从图数据中卸载。
- 当前节点一跳强关系永远可见。
- 当前推荐路径优先于一般相关关系。
- 目标切换时从当前投影插值到下一投影，不先跳回全景。

## 6. AI 架构

### 6.1 AI 不是聊天框

AI 只通过三类结果出现：

- 目标解析结果。
- 节点解释结果。
- 学习路径结果。

界面不出现聊天记录、机器人头像、输入气泡和“你可以问我任何问题”。

### 6.2 最小上下文包

每次节点解释只发送当前任务需要的内容：

```ts
interface NodeContextPacket {
  profile: Pick<UserProfile, 'major' | 'stage' | 'goal' | 'foundation'>
  activeGoalId: string
  node: KnowledgeNode
  ancestorPath: KnowledgeNode[]
  prerequisites: KnowledgeNode[]
  strongNeighbors: KnowledgeNode[]
  allowedNodeIds: string[]
  outputSchemaVersion: string
}
```

不得把完整 100 节点无差别塞给模型。AI 输出中的节点 ID 必须经过白名单校验。

### 6.3 三个服务接口

```ts
interface GoalParser {
  parse(profile: UserProfile, graph: KnowledgeGraph): Promise<GoalMatch>
}

interface NodeExplainer {
  explain(packet: NodeContextPacket): Promise<NodeExplanation>
}

interface PathGenerator {
  generate(profile: UserProfile, goalId: string, graph: KnowledgeGraph): Promise<LearningPath>
}
```

每个接口同时提供 `local` 和 `remote` 实现。远端实现只做增强，不是演示闭环的单点依赖。

### 6.4 知识可信度边界

- 正式节点、课程结构、硬前置和练习归属由人工策划或审核。
- AI 可以生成个性化语言，但不能运行时改写公共知识图谱。
- AI 解释必须标记依据的节点和路径。
- AI 不确定时应返回低置信度和备选目标，而不是伪造节点。

## 7. 三维交互状态机

```text
ONBOARDING
  → UNIVERSE_OVERVIEW
  → GOAL_TRANSITION
  → GOAL_FOCUS
  → NODE_TRANSITION
  → NODE_FOCUS
  → PATH_REVEAL
```

任意状态可进入 `AI_LOADING`、`AI_LOCAL_FALLBACK` 或 `ERROR_RECOVERABLE`，完成后返回原空间状态。

### 7.1 全景

- 展示完整五层结构和主要领域簇。
- 只显示极少数高层标签。
- 不显示固定方向选择器、层级图例、操作说明卡和学习路径面板。
- 左上只保留品牌；右上只保留低存在感的全景/重设入口。

### 7.2 目标聚焦

- 相关节点变亮、适度放大、向构图中心聚集。
- 无关节点弱化并外移，仍保持空间存在。
- 相机根据激活子图包围盒计算位置，不能对四个目标使用同一固定机位。
- 目标路径先出现结构，再出现细节标签。

### 7.3 节点聚焦

- 点击节点启动一次性相机过渡。
- 用户拖拽时立即取消自动相机控制，结束“相机与 OrbitControls 抢控制权”。
- 聚焦后只强化一跳关系和必要的二跳上下文。
- 详情与节点空间绑定，桌面不使用固定 430px 后台侧栏。
- 移动端允许使用低初始高度 bottom sheet，但必须保留被选节点的可见区域。

### 7.4 路径展示

- 路径的主要表达发生在 3D 场景内。
- 依次强化目标、方向、课程/技能、知识、练习。
- DOM 只允许出现低高度顺序索引，不能再用宽大的底部 Dashboard 面板重复画一遍流程。
- 点击路径步骤可移动到对应节点；连续点击以最后一次选择为准。

## 8. 黑色系视觉基线

### 8.1 设计方向

不是“宇宙星空”，而是一个深色、安静、可进入的知识场。可以使用神经网络的“信号传递”隐喻，但不使用大脑造型、星球、无意义粒子、紫蓝渐变和持续闪烁。

建议 Token：

```text
canvas-bg       #06080B
canvas-fog      #090D12
surface-1       #0C1117
surface-2       #111820
text-primary    #F3F5F7
text-secondary  #9DA7B3
text-muted      #626D79
hairline        rgba(225, 235, 245, 0.10)
node-inactive   #313944
accent          #9FC7FF
accent-hot      #DCEBFF
```

强调色只用于当前节点、当前路径和键盘焦点。品牌、普通按钮、图例、所有 hover 不得同时争夺同一种强调色。

### 8.2 节点

- 节点是克制的空间实体，不做泛光球海洋。
- 目标、方向、课程、知识、练习通过尺寸、材质粗糙度和轮廓层级区分。
- 默认标签为无底色文字；只给选中节点少量局部底衬。
- 不在每个标签重复显示节点类型。
- 不相关方向不常显标签。
- 激活节点允许一次轻微的明度呼吸，用于表达系统当前选择；背景节点不循环动画。

### 8.3 曲线关系

- `contains`：稳定的跨层三次贝塞尔曲线，控制点沿 Y 轴推进。
- `prerequisite`：同层或跨层的有向曲线，硬前置比软前置更实。
- `related_to`：低透明度二次贝塞尔曲线，只在局部图中出现。
- 曲线弯曲方向由 edge ID 的稳定哈希决定，刷新后不变化。
- 信号流动只出现在当前路径，且只沿曲线前进；禁止全局粒子漂浮。
- 删除五个贯穿画面的巨大矩形层级框；层级只用当前区域的极淡短弧或空间雾差表达。

### 8.4 DOM 界面纯净规则

主场景默认只保留：

- 左上：iTeach 品牌。
- 右上：低存在感的全景和重设入口。
- 中央：WebGL 知识空间。

禁止常驻：

- 顶部方向选择器。
- 左侧大目标标题。
- 五层图例。
- 底部操作说明。
- 右下大型“规划路径”卡片。
- 固定右侧详情栏。
- 固定底部学习路径大面板。

功能没有删除，只改为在用户需要时出现，并且同一时刻只允许一个主要信息面板。

## 9. 响应式构图

### 9.1 21:9 与超宽屏

- 不把节点简单拉满到两侧。
- 激活子图保持在视觉中央 60% 宽度内。
- 详情出现时使用右侧安全区，镜头把节点移到剩余空间的视觉中心。
- UI 最大边距随视口缓慢增长，避免贴边。

### 9.2 16:9 / 16:10

- 作为默认验收构图。
- 相机根据激活包围盒与 UI 安全区计算，不写死一个位置。
- 节点标签密度以屏幕投影距离控制。

### 9.3 4:3 与平板

- 减少同时可见标签数量。
- 详情使用窄浮层或底部面板，避免压缩 3D 空间到狭窄条带。
- 触控旋转与点击需要明确的移动阈值，防止拖拽误触节点。

### 9.4 手机竖屏

- 默认只显示目标主路径与极少上下文节点。
- 节点详情以 bottom sheet 呈现，初始高度不超过约 45dvh，可继续上拉。
- 详情打开时隐藏非必要导航。
- 所有可操作目标至少 44×44 CSS px。
- 必须完成画像、目标聚焦、节点选择、详情查看和返回全景的完整闭环。

### 9.5 通用适配

- 使用 `100dvh` 和 safe-area inset。
- 支持 `prefers-reduced-motion`：相机缩短或直接到位，路径取消流动信号。
- 支持 WebGL 降级提示，不让页面停在纯黑空屏。
- 画面缩放不依赖固定像素坐标，DOM 锚点必须进行视口边界修正。

## 10. 数据校验与不可放宽的验收层

以下检查相当于开发过程中的固定评测，不得为了通过构建而删除或放宽：

- 总节点约 100 个，覆盖考研 408、AI 工程、游戏开发、前端开发。
- 六类节点均存在，且节点类型与层级合法。
- ID 唯一。
- 边 ID 唯一，无重复边、悬空引用和自关联。
- `prerequisite` 子图无环。
- `contains` 关系满足合法父子层级。
- 每条硬前置都有非空 `reason`。
- 关键知识点具有掌握证据和至少一个练习。
- “计算机考研 408”稳定命中 408 目标。
- `408 → 数据结构 → 链表 → 链表练习` 路径可达。
- 无关节点只弱化，不从原始图中删除。
- AI 输出中的节点 ID 全部属于白名单。
- 远端 AI 不可用时本地闭环仍可完成。
- production build 成功，控制台无未处理异常。

## 11. Karpathy 式开发循环在本项目中的使用

[autoresearch](https://github.com/karpathy/autoresearch)展示了一个小而真实、目标明确、固定评测、反复保留或丢弃改动的 Agent 工作模式。iTeach 不照搬其研究代码，但采用同样的工程纪律。

施工规范相当于本项目的 `program.md + schema`：固定产品目标、模块边界、视觉 Token、状态机、性能预算、响应式规则和验收标准。

每次实现循环必须是：

```text
实现一个边界清晰的改动
→ 类型检查
→ 图数据校验
→ 单元测试
→ 启动真实浏览器
→ 完成固定演示路径
→ 检查控制台
→ 对 1440×900、1920×1080、超宽、平板、390×844 截图
→ 根据构图与交互结果保留或修复
→ 重跑完整验收
```

“一次开发达到最终效果”指用户不需要在中途反复确认，不代表内部跳过验证。

## 12. 实施顺序

下一步施工按以下顺序，不再回到浅色 V2：

1. 将本文转化为文件级、组件级、按钮级 V3 施工规范。
2. 建立统一黑色视觉 Token，并同步 CSS、Three 场景、灯光、fog 和浏览器主题色。
3. 删除顶部方向选择器和常驻 Dashboard HUD。
4. 删除巨大层级矩形框，将直线边改为稳定的分类型曲线。
5. 重做目标投影、局部图和标签可见性。
6. 重做相机意图，按子图包围盒构图并释放用户控制权。
7. 将节点详情改为空间绑定的渐进信息层。
8. 将学习路径的主体表达移回 3D 空间。
9. 重做 onboarding，使其服务画像采集而不是 AI 落地页营销。
10. 完成全尺寸浏览器验收、性能校准和最终修复。

## 13. 终止条件

当比赛评委能够在不阅读说明书的情况下完成以下流程，本阶段产品才算完成：

1. 输入“软件工程本科生，目标计算机考研 408”。
2. 看见知识空间根据目标发生有意义的重组。
3. 理解亮起的节点与路径为何相关。
4. 沿镜头进入数据结构，再进入链表。
5. 查看链表的前置、后继、推荐内容和 AI 解释。
6. 返回目标区域或全景，且不会迷失。

最终观感应是“进入一个会根据目标组织知识的数字空间”，而不是“在黑色 Dashboard 中观看一个 3D 图”。

---

## 14. 参考资料与许可证提醒

- [Marble os-taxonomy](https://github.com/withmarbleapp/os-taxonomy)：数据库关系采用 ODbL 1.0，Marble 原创文字采用 CC BY-SA 4.0，外部课程标准遵循各自许可证。iTeach 只借鉴方法并使用原创大学数据。
- [Obsidian Graph View Help](https://github.com/obsidianmd/obsidian-help/blob/master/en/Plugins/Graph%20view.md)：参考全局图、局部图、关系深度和悬停/点击行为。
- [Karpathy LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)：参考持久知识层、raw/wiki/schema、ingest/query/lint 和 index/log。
- [Karpathy 2025 LLM Year in Review](https://karpathy.bearblog.dev/year-in-review-2025/)：参考上下文工程、领域 GUI 和部分自主。
- [Karpathy autoresearch](https://github.com/karpathy/autoresearch)：参考固定边界、固定评测和持续验证的 Agent 执行方式。

