# HumanRAG V11 Final 项目报告

> 报告日期：2026-09-14
>
> 工作分支：`feat/v11-humanrag-competition-final`
>
> 状态：本地施工与验收完成；未合并、未推送、未部署

## 产品结论

HumanRAG 是由知识库、知识树和知识点组织的大学计算机学习产品。三维空间负责导航和表达关系；用户目的决定本次从已有知识中选择和组织什么，真实学习证据决定下一步先做什么。

当前比赛深度样板已经形成一条完整链：

```text
星座 Opening → 完整 Universe → 自然语言目标 → 从 Registry 检索
→ 普通个人 KnowledgeTree → Library 连续预览 → TCP 独立验证错答
→ 实际误区补教 → 一对全新任务无提示通过 → 学习证据
→ 知识树与 Universe 同步更新
```

## 当前实现

- Opening、Universe、Library 与知识树使用态共享一个 Canvas 和 WebGL context。开场、抽取、Library 交接和 Tree 内面板切换保持对象身份。
- 目标组树只选择 Registry 里已有的 KnowledgePoint，并通过与手动建树相同的 `createTree` 事务写成普通用户树；它不生成新知识点，也不修改 canonical Universe 拓扑。
- Library 同时保留各棵树，选树时由相机移动。进入知识树后，学习路径、能力验证和节点详情只替换右侧面板。
- Study、Teach、Verify 是三条独立工作流。带我学读取真实作答与误区；独立验证只使用未曝光任务，提示后正确和旧题重做不能形成强证据。
- 学习状态与推荐由统一领域规则推导，在 Welcome、Universe Inspector、知识树、教学、练习与 Evidence 中复用。
- TCP 样板引用 RFC 5681 §3.1，并明确是无丢包、逐 RTT 的简化教学模型。

## 交付入口

- `/`：星座 Opening 与 Universe 苏醒。
- `/universe`：完整知识空间、搜索、目标和 Inspector。
- `/library`：系统树与个人树的连续预览空间。
- `/library/:libraryId/tree/:treeId/path`：知识树学习路径。
- `/library/:libraryId/tree/:treeId/verify`：知识树能力验证。
- `/library/:libraryId/tree/:treeId/point/:pointId/study`：自主学习。
- `/library/:libraryId/tree/:treeId/point/:pointId/teach`：带我学。
- `/library/:libraryId/tree/:treeId/point/:pointId/verify`：知识点独立验证。
- `/progress`：学习证据、误区和下一步建议。

## 验收证据

- 完整执行记录：`docs/humanrag-v11-final-progress.md`
- 逐批施工记录：`docs/humanrag-v11-progress.md`
- 8 分钟比赛流程：`docs/humanrag-v11-competition-demo.md`
- 可执行主链：`e2e/competition-journey.spec.ts`
- 可重复视觉矩阵：`e2e/visual-acceptance.spec.ts`
- 本地截图产物：`output/v11-final/visual-acceptance/`

最终自动门禁数字以 `docs/humanrag-v11-final-progress.md` 的最后一次完整运行结果为准。构建保留 `lottie-web` 上游 `eval` 警告；它没有阻断构建。软件渲染浏览器验收不能代替 Windows、Safari、真实触屏和真实 GPU 帧时间检查。

## 版本边界

V3–V10 文档保留为历史材料。它们描述过独立教学/刷题首页、旧路由或旧统计口径，不能覆盖 V11 的产品边界。当前实现和讲述以 V11 Final 施工方案、执行报告和比赛手册为准。
