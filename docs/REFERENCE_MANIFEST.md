# HumanRAG V10 reference manifest

| Source | Selected capability | Project location | Runtime boundary |
| --- | --- | --- | --- |
| GSAP / gsap-skills | labeled interpolation, cleanup and high-frequency tween discipline | `src/scene/CameraController.tsx` | official npm package only |
| Motion | panel entry/exit and responsive sheet behavior | `src/components/*` | existing npm dependency |
| Inspira UI | spatial connector, progressive blur, compact Dock and neural environment ideas | `src/components/*`, `src/scene/*` | React/R3F rewrite only |
| Impeccable | obsidian surface ladder and gold hairline usage | `src/styles.css` | custom tokens only |
| Marble os-taxonomy | stable data graph and prerequisite semantics | `src/graph/*`, `src/data/*` | model only, no source data |
| Apple, Claude, Linear, Runway design references | product-first scene, continuous reading surface and restrained chrome | UI layout and CSS | visual principles only |
| UI UX Pro Max and Taste Skill | performance, responsive and anti-template quality checks | implementation review | development standards only |

## 新增参考：ORBIT（2026-09-07）

- 项目：[ryh842487118-bot/orbit](https://github.com/ryh842487118-bot/orbit)。
- 核查版本：`72e911446b011c011b127f441ecfaa891df12756`。
- 参考重点：连续运镜（观察中心、方向、距离协同变化）、跨尺度的对数距离插值、随尺度变化的标签与关系密度、主体构图与轮廓光、首帧准备、用户输入打断自动运镜。
- 源码索引：[src/universe.js](https://github.com/ryh842487118-bot/orbit/blob/72e911446b011c011b127f441ecfaa891df12756/src/universe.js)，重点函数为 `flyTo`、`updateFlight`、`trackingCenter`、`updateTracking`、`updateVisibility`、`resize`、`init`。
- 开场边界：ORBIT 初始化后直接呈现地球机位并淡出加载层；没有可直接移植的多阶段开场时间轴。iTeach 的开场分镜需围绕现有知识图谱另行设计。
- 许可边界：此版本未发现覆盖项目自写源码的仓库级许可证；`assets/THREE-LICENSE.txt` 仅覆盖 Three.js，不能视为整个项目的 MIT 授权。自写源码目前仅作研究参考，复制前需确认许可。天体纹理见 [assets/CREDITS.md](https://github.com/ryh842487118-bot/orbit/blob/72e911446b011c011b127f441ecfaa891df12756/assets/CREDITS.md)，来源为 Solar System Scope，标注 CC BY 4.0。
- 适配范围：沿用 iTeach 现有 React / R3F / Three.js、相机控制与性能降级，不整体引入其场景脚本、单文件构建、天体模型、银河粒子、四边 HUD 或与视觉无关的访问统计请求。
- 实施状态（2026-09-09）：在现有 GSAP / Three.js 中独立实现目标点插值、方向球面插值与对数距离插值（`src/scene/entryShot.ts`）；只借鉴运镜原则，未复制 ORBIT 自写源码或资产。页面层叠使用浏览器原生 View Transitions 与现有路由能力，没有新增运行时依赖。材质调整使用现有几何体和灯光；Ponytail 的最小实现原则用于保留共享工作区、修复状态根因，不增加第二套路由或数据模型。

## 流光与教学呈现参考（2026-09-09）

本轮实际阅读以下本地示例，采用运动与布局原则，继续复用项目现有组件；没有整体搬入示例、增加动画引擎或复制参考项目素材。

- `iTeach-design-references/inspira-ui/app/components/inspira/ui/animated-beam/AnimatedBeam.vue`：弱背景路径与亮芯沿同一路径循环，落实于 `src/scene/NeuralSignals.tsx`。复用已有 Three.js 曲线与点着色器，短尾迹属于真实知识关系，不添加游离装饰粒子。
- `iTeach-design-references/inspira-ui/app/components/inspira/ui/timeline/Timeline.vue`：用细轨迹、当前阶段标记和留白建立阅读顺序，落实于 `TcpLesson.tsx` 的阶段栏与 `tcp-lesson.css`，不照搬纵向长滚动网页。
- `iTeach-design-references/anime/examples/svg-graph/index.js`：图形路径与数字的同一段时间关系，落实于 TCP 逐轮示范。使用现有 SVG/CSS 动画与教学状态；暂停/继续统一控制曲线和新增窗口块，播放结束才更新实际轮次与数值。
- Ponytail 边界：修复现有 Landing 状态、CameraControls 机位读取及共享导航槽；创建入口使用已有主操作槽。教学与刷题继续共用结构化作答组件，不增加第二套知识、路由或判题模型。

## 神经星空与目录工作区（2026-09-10）

- 用户最新方向：每个真实节点是一颗自发光的神经元星点，而非受光实体球。新方向取代此前玉色多面体表面方案。
- 实际阅读 `inspira-ui/app/components/inspira/ui/bg-neural/NeuralBg.vue`、`particles-bg/ParticlesBg.vue` 与 `animated-beam/AnimatedBeam.vue`：采用亮部聚集、柔和衰减、弱路径承载移动亮芯的对比关系。没有引入 NeuralBg 的 OGL 引擎、全屏十五层噪声或 ParticlesBg 的随机漂移粒子；在现有 Three.js 中独立实现 `src/scene/neuronAppearance.ts` 的真实节点着色器，由 Universe 与树编辑/预览共用。
- 本地 `awesome-design-md/design-md/linear.app/DESIGN.md`：参考中性深色表面层次、冷白文字与少量强调色，修正全局 tokens、导航和详情面板；该文件是本地设计分析，不宣称为官方组件实现。
- 本地 `awesome-design-md/design-md/framer/DESIGN.md`、`spacex/DESIGN.md`：目录工作区借鉴大字主标题、明确视觉重心、细线与留白，落实于 `src/features/knowledge-tree/tree-directory.css`。没有复制品牌素材或营销页面内容。
- 最小实现：继续使用已有 React、Three.js、CSS 和图谱关系；修复导航原生折叠状态冲突，不重建导航注册系统；补齐目录缺失样式，不复制教学或判题页面。未新增运行时依赖。
