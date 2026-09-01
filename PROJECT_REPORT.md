# iTeach 项目说明报告

> **报告日期**：2026-09-01  
> **项目路径**：`/Users/morton_cheung/Desktop/AI/iTeach`  
> **当前版本**：v8（空间连续性规范，见 `docs/iteach-v8-spatial-continuity-construction-guide.md`）  
> **状态**：V7 教学产品闭环与 V8 空间交互补丁均已完成；类型检查、单元测试、生产构建与 E2E 全绿

---

## 一、产品定位

**iTeach 是一个面向大学计算机学科的 AI 教学产品**。它把离散的知识组织成可探索的三维关系网络，并由系统完成「诊断 → 教学 → 练习 → 纠错 → 掌握验证」的完整闭环。

核心命题（来自 v7 规范 §2）：**仅仅是目录、搜索、学习路径，只是 Study，不算 Teach**。只有跑通下面这条链路，才算一个"会教"的系统：

```
判断水平 → 选教学内容 → 解释概念 → 展示示范 → 引导练习
→ 检测掌握 → 识别错误原因 → 针对错误复教 → 再次检测 → 记录掌握证据
```

三维知识空间不是产品的全部，而是"找到知识、看见关系"的入口。

---

## 二、版本演进（重要：旧文档已过时）

| 版本 | 文档 | 状态 | 说明 |
|------|------|------|------|
| v3 | `knowledge-universe-construction-spec.md` 等 | **历史存档** | "100 节点三维知识宇宙"，README 与旧 PROJECT_REPORT 停留在此 |
| v4 | `knowledge-universe-v4-construction-blueprint.md` | 历史存档 | 引入外部参考库清单 |
| v5 | `knowledge-universe-v5-construction-guide.md` | 历史存档 | 强化三维交互，明确"不显示开屏"——与 v7 冲突 |
| v6 | `iteach-v6-multi-module-product-blueprint.md` | 历史存档 | 六模块产品蓝图，自述"尚未进入代码施工" |
| **v7** | **`iteach-v7-final-construction-guide.md`** | **当前有效** | 8/31 冻结的施工规范，含批次 0–8 与测试清单 |
| **v8** | **`iteach-v8-spatial-continuity-construction-guide.md`** | **当前有效** | 同一 Canvas 连续入场、全节点拾取、常驻神经信号、三维个人知识树与节点工坊 |

> ⚠️ **`README.md` 与本章节在 8/29 之前的描述（100 节点、纯宇宙 Demo）均已过时**。实际代码是 v7 多模块形态，数据已扩展到 **336 节点**。请以 v7 规范与本节为准。

---

## 三、技术栈

| 层级 | 选型 | 用途 |
|------|------|------|
| 前端框架 | React 19.1 + TypeScript 5.8 | UI 组件 / 类型安全 |
| 构建工具 | Vite 7.1 | 开发服务器 / 构建 / 分包 |
| 3D 渲染 | Three.js 0.179 + @react-three/fiber 9 + @react-three/drei 10 + postprocessing | WebGL 知识空间 |
| 状态管理 | Zustand 5 | 7 个分域 Store |
| 图数据结构 | Graphology 0.26 | 知识图谱存储与遍历 |
| UI 动画 | Motion (Framer) 12 + GSAP 3 + animejs 4 + lottie-web | DOM / 转场动画 |
| 样式 | Tailwind CSS 4 | 原子化样式 |
| 数据校验 | Zod 4 | 运行时类型验证 |
| 路由 | react-router-dom 7 | 8 条路由，`lazy()` 分包 |
| 测试 | Vitest 3（单元）+ Playwright 1.62（6 组 E2E） | 质量保障 |
| 部署 | `vercel.json`（SPA 回退到 index.html） | 静态站点 |

---

## 四、产品模块与路由

| 路由 | 页面组件 | 说明 |
|------|----------|------|
| `/` | `LandingPage` + `SpatialExperienceShell` | 同一棵知识树的俯视开屏；Canvas 不重建 |
| `/universe` | `UniversePage` | 三维知识空间（通旧体系入口） |
| `/teach` | `TeachingHomePage` | 教学首页 / 推荐队列 |
| `/teach/:unitId` | `TeachingSessionPage` | 单教学单元会话（解释→示范→练习→检测） |
| `/practice` | `PracticeHomePage` | 刷题首页（5 种模式） |
| `/practice/session/:sessionId` | `PracticeSessionPage` | 刷题会话 |
| `/library` | `LibraryHomePage` | 知识库列表 |
| `/library/new` | `LibraryBuilderPage` | 自建三维知识树（卡片凝聚节点 + 空间关系编辑） |
| `/library/:libraryId` | `LibraryDetailPage` | 知识库详情 |
| `/progress` | `ProgressPage` | 学习记录 / 掌握度可视化 |

导航：`GlobalNav`（桌面：知识空间/教学/刷题/知识库 + 搜索 + 学习记录）、`MobileNav`（移动端 5 项 + 重置演示数据）。

---

## 五、模块完成度

当前约有 **16,166 行 TS/TSX/CSS 源码**，另有约 419 行 Playwright E2E；功能按 app、features、data、services、store、scene、graph 分域维护。

| 模块 | 行数 | 判定 |
|------|------|------|
| `features/library-builder` | — | **完成**：5 步向导；`GraphEditorStep` 为可旋转、缩放、拖放、连线的三维树，`NodeAtelier` 采用内容→空间属性两段式同一对象转场 |
| `features/teaching` | ~1,076 / 12 | **完成**：接 `teachingStore` + `TeachingDecisionEngine`，含推荐/复习队列 |
| `features/practice` | ~795 / 10 | **完成**：5 种模式（每日/目标/节点/模拟卷/错题）全部落地 |
| `features/library` | ~559 / 6 | **完成**（偏展示）：接 `ContentRepository` + `libraryStore` |
| `features/progress` | ~393 / 5 | **完成但最薄**：4 个只读可视化组件，无交互 |
| `features/landing` | — | 开屏 DOM 叙事层；底层与知识空间共用同一棵真实三维树 |
| `features/universe` / `features/spatial` | — | 持续 Canvas、landing/entering/universe 状态机、连续相机与全节点命中代理 |

无占位页面（`ComingSoon.tsx` 零引用）、无 `TODO`/`FIXME`、无空函数。

---

## 六、架构与数据层

### 6.1 分层

```
数据层 (data/v6) → 图计算层 (graph) → 服务层 (services/content) → 状态层 (store/*)
                                                                      ↓
                                                            场景层 (scene) / UI 层 (features)
```

- **状态隔离**：7 个 Store 分域独占（user / knowledge / teaching / practice / progress / library / ui），禁止双向导入；持久化键统一 `iteach:v7:*`，单域损坏只重置该域。
- **内容统一访问**：`services/content/ContentRepository.ts` 统一读取顺序为 系统静态 → 用户已发布库 → `undefined`，三页面禁止直接访问静态 Map。
- **确定性**：位置/题目物化均用确定性 seed（`seededRandom.ts`），无 `Math.random`、无运行时力导向；相同输入必定相同输出。

### 6.2 数据规模（v6 体系，运行时物化）

- 知识节点 **336**（每分支 >70），边 ~646
- 题目 **4,336** = 3,840（480 蓝图 × 8 变式）+ 336 诊断 + 160 补救
- 教学单元 **336** × 8 步 = 2,688 步
- 模拟卷 24 套 × 40 题；学习者画像 24；答题 1,200；证据 380；误区 96；补救任务 28

### 6.3 AI 教学引擎

非 LLM 调用，是基于规则 + 确定性 seed 的本地引擎（`src/ai/`）：
- `TeachingDecisionEngine`：分支选择、补救、终止逻辑（真实实现）
- `PracticePlanner`：刷题会话编排
- `localKnowledgeAI` / `misconceptionMatcher`：节点解释与误区匹配

---

## 七、健康度

| 检查 | 命令 | 结果 |
|------|------|------|
| 类型检查 | `npm run typecheck` | ✅ 通过 |
| 单元测试 | `npm run test` | ✅ 11 文件 / 64 用例全通过 |
| 生产构建 | `npm run build` | ✅ 成功（Vite 构建约 5.3s） |
| 端到端测试 | `npm run test:e2e` | ✅ 7 个规格文件 / 18 用例全通过 |
| 响应式验收 | Playwright 390 / 768 / 1440 | ✅ 无横向溢出，移动端节点工作室可操作 |
| 页面截图 | `output/batch0/` | ✅ 5 页 1440×900 截图已存 |

构建产物中 `spatial-runtime` 约 1.09 MB（Three.js，独立分包；开屏和 `/universe` 因共用真实场景均会加载）。

---

## 八、已知问题与技术债

1. **git 风险**：仅一次「初始提交」，之后约 **110 个文件变更未提交**。v7 规范批次 0 要求创建分支 `codex/iteach-v7-final`，此步尚未做。**严禁 `git reset --hard` / `git clean`**。
2. **历史兼容代码**（不影响演示，可在后续版本清理）：
   - `src/app/ComingSoon.tsx`
   - `src/components/OnboardingScreen.tsx`
   - `src/scene/KnowledgeCurves.tsx`、`KnowledgeNodeMesh.tsx`、`ScreenAnchorTracker.tsx`
   - `src/data/v6/generated/manifest.ts`
   - `src/ai/teaching/misconceptionMatcher.ts`
3. **构建警告**：`lottie-web` 上游包包含 `eval`，Vite 会输出安全提示；当前按独立分包延迟加载，不阻断构建。
4. **文档历史版本**：`README.md` 与 v3–v6 文档属于历史资料，当前实现以 V7 指南和本报告为准。

---

## 九、施工路线（v7 批次）与当前进度

| 批次 | 内容 | 退出条件 | 进度 |
|------|------|----------|------|
| 0 | 恢复可验证基线 | 三项命令通过 + 5 页可开 | ✅ 完成 |
| 1 | 修正题型判定（多选/排序/判断） | 五类题型正误用例全通过 | ✅ 完成 |
| 2 | 修正教学复测与终止（最多两轮复教） | 弱诊断、复教、终止分支无死循环 | ✅ 完成 |
| 3 | 统一系统与自定义内容（Repository） | 自定义库接入同一闭环 | ✅ 完成 |
| 4 | 持久化与状态隔离 | 多域独立持久化/迁移 | ✅ 完成 |
| 5 | 知识库创建闭环 | 创建、发布、编辑、教学、刷题 | ✅ 完成 |
| 6 | 开屏与三维交互 | 开屏→空间转场与交互 | ✅ 完成 |
| 7 | 视觉收敛 | 统一设计令牌与响应式 | ✅ 完成 |
| 8 | E2E、性能与部署 | 6 组 E2E、自动性能档、SPA 回退 | ✅ 完成 |
| V8 补丁 | 空间连续性与个人三维知识树 | 同一场景入场、常驻信号、全节点点击、连续详情面板、三维建树 | ✅ 完成 |

**结论**：V7 产品闭环与 V8 空间交互补丁已经完成。后续工作应限制为 Windows 实机巡检、比赛文案微调和正式部署，不再扩展产品范围。

---

## 十、文档索引

- `docs/iteach-v8-spatial-continuity-construction-guide.md` — **当前空间交互与个人知识树规范**
- `docs/iteach-v7-final-construction-guide.md` — 教学产品闭环与批次 0–8 规范
- `docs/iteach-v6-multi-module-product-blueprint.md` — v6 蓝图（已覆盖）
- `docs/knowledge-universe-v5-construction-guide.md` — v5（部分三维/性能内容被 v7 继承）
- `docs/knowledge-universe-construction-spec.md` / `v3-implementation-spec.md` — v3 存档
- `docs/REFERENCE_MANIFEST.md` — v4 外部参考库清单（存档）

---

**报告更新**：2026-09-01 · 基于对仓库代码的实测（typecheck / 64 单测 / 18 E2E / build）与 v7、v8 规范核对。
