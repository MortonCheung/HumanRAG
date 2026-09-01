# iTeach AI 教学系统

iTeach 是面向大学计算机学科的三维知识导航与自适应教学 Demo。产品包含知识空间、教学、刷题、个人知识库和学习记录五个核心模块，所有演示数据均在本地确定性生成，不依赖后端或 API Key。

## 本地启动

```bash
npm install
npm run dev
```

Vite 会输出本地访问地址。生产模式可运行：

```bash
npm run build
npm run preview
```

## 验证

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright 使用独立的 `127.0.0.1:42873` 生产预览端口，避免与本机其他 Vite 项目冲突。

## 产品入口

- `/`：同一棵三维知识树的俯视开屏；进入时连续转为斜视操作视角。
- `/universe`：可旋转、平移、缩放的三维知识空间。
- `/teach`：诊断、讲解、示范、练习、纠错和掌握验证。
- `/practice`：每日练习、目标练习、知识点练习、模拟卷与错题复习。
- `/library`：系统知识库、48 个大学课程模板和个人知识库。
- `/library/new`：独立三维知识树创建、卡片式节点定制、空间关系编辑、教学与题目生成。
- `/progress`：掌握度、证据、误区与待教学任务。

## 演示数据

- 336 个计算机知识节点与约 646 条关系。
- 336 个教学单元，每个单元 8 个教学步骤。
- 4,336 道题与 24 套模拟卷。
- 48 个大学课程模板与 24 个演示学习者画像。

## 代码结构

```text
src/app/          路由与应用外壳
src/features/     开屏、知识空间、教学、刷题、知识库、学习记录
src/data/         系统图谱、教学数据与题目生成
src/services/     内容 Repository 与本地持久化
src/store/        分域 Zustand 状态
src/scene/        React Three Fiber 三维渲染
src/features/spatial/ 开屏与知识空间共用的持续 Canvas 和入场状态机
src/graph/        图关系、路径与聚焦计算
src/performance/  自动画质和渲染预算
e2e/              Playwright 评委闭环与响应式测试
```

完整空间连续性施工规范见 `docs/iteach-v8-spatial-continuity-construction-guide.md`，当前交付状态见 `PROJECT_REPORT.md`。

## 部署

项目是静态 SPA。`vercel.json` 已配置深层路由回退，可直接部署到 Vercel；其他服务器需要把非静态请求回退到 `index.html`。
