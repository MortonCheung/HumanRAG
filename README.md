# HumanRAG · iTeach

HumanRAG 是面向大学计算机学习的定向教学产品。它保留完整知识关系，并结合用户目标与真实学习证据，从既有知识中组织一棵可学习、可验证的个人知识树。

三维空间负责导航和表达知识关系；教学内容、独立验证与学习证据共同决定下一步。当前比赛深度样板是“准备 408、网络基础薄弱 → TCP 误区补教 → 新任务独立验证 → 证据写回”。所有生成和判定均在本地确定性完成，不需要后端或 API Key。

## 本地运行

```bash
npm install
npm run dev
```

生产预览：

```bash
npm run build
npm run preview
```

## 验证

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Playwright 使用独立的 `127.0.0.1:42873` 生产预览端口。视觉验收用例会把 1440 × 900 的 15 个关键画面和 390 × 844 的移动端核心画面写入 `output/v11-final/visual-acceptance/`。

## 当前产品入口

- `/`：星座开场；进入后沿同一 Canvas 苏醒为完整 Universe。
- `/universe`：完整知识空间、搜索、目标输入和节点 Inspector。
- `/library`：计算机知识库中的全部系统树与个人树；所有树位于自适应三维环中，共享相机在树之间移动。
- `/library/:libraryId/tree/:treeId/path`：知识树的单一知识点视图；旧的树级 `/verify`、`/learn` 与 `/practice` 会回到这里。
- `/library/:libraryId/tree/:treeId/point/:pointId/study`：自主学习。
- `/library/:libraryId/tree/:treeId/point/:pointId/teach`：基于真实作答的“带我学”。
- `/library/:libraryId/tree/:treeId/point/:pointId/verify`：新题独立验证。
- `/progress`：学习证据、待解决误区与统一下一步建议。

全局导航只保留“知识空间”和“知识库”。用户从知识点选择“自学 / 带我学 / 刷题”，同一知识点始终复用同一套学习工作区。

## 核心实现边界

- 自动建树只选择 Registry 中已有的 KnowledgePoint，产物是普通的用户 KnowledgeTree。
- 正常目标聚焦只改变相关性、优先级和推荐，不修改 Universe 的知识拓扑。
- Opening、Universe、Library 和知识树使用态共享一个 Canvas；切树移动相机，不重建场景。
- 提示后正确、已曝光任务再次正确或不完整验证都不能形成“已独立验证”。
- TCP 内容明确引用 RFC 5681 §3.1，并声明逐 RTT 简化模型的适用边界。
- 用户可以留下待解决问题；问题参与同一推荐，但产品不提供聊天区。

## 文档

- [V11 最终施工方案](docs/humanrag-v11-final-spec.txt)
- [V11 执行与验收](docs/humanrag-v11-final-progress.md)
- [V11 比赛最终冻结报告](docs/humanrag-v11-competition-final-report.md)
- [比赛 8 分钟演示手册](docs/humanrag-v11-competition-demo.md)
- [逐批施工记录](docs/humanrag-v11-progress.md)

旧版 v3–v10 文档保留为历史资料，不能覆盖 V11 的产品边界。

## 目录

```text
src/app/               路由、常规页面外壳与转场
src/domain/            知识与学习证据领域规则
src/ai/                目标组树、教学决策与统一推荐
src/features/          空间、知识库、知识树、学习、教学、验证与证据页面
src/scene/             Three.js 场景、相机、节点和突触脉冲
src/services/          内容仓库与本地持久化
src/store/             分域 Zustand 状态
e2e/                   评委主链、连续性、响应式与视觉验收
```

项目是静态 SPA；`vercel.json` 已配置深层路由回退。正式部署与 Windows、Safari、真实触屏设备验收不包含在本地完成声明中。
