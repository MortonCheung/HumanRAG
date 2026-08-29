# iTeach 三维知识地图

目标驱动的三维知识地图 Demo。用户先建立学习画像，再进入由目标、方向、课程、知识点和练习组成的 WebGL 空间。视觉采用空间切片与知识地形，不使用星球、星空或随机粒子隐喻。

## 启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## 核心入口

- `src/data/knowledgeGraph.ts`：100 个节点、关系、确定性目标匹配。
- `src/graph/relevance.ts`：相关度、聚焦布局、路径派生。
- `src/scene/UniverseCanvas.tsx`：R3F 知识地形、薄型节点、边和相机。
- `src/store/knowledgeStore.ts`：画像、目标、节点详情和 AI 状态。
- `src/components/OnboardingScreen.tsx`：学习画像引导。
- `src/components/ExplorerInterface.tsx`：方向切换、空间信息、节点详情和学习路径。
- `src/App.tsx`：场景与界面的轻量装配。
- `docs/knowledge-universe-construction-spec.md`：完整施工规范。

首版 AI 使用本地知识库，不需要 API Key；远端代理接口可按施工文档第 23 节接入。

## 屏幕适配

界面针对 21:9 超宽屏、16:9、16:10、4:3、平板和手机纵横屏设置了独立的构图收缩规则。移动端使用底部操作栏，节点详情改为可滚动的底部面板。
