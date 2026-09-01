import type { BranchId } from '../../../graph/types';

export interface MisconceptionEntry {
  id: string;
  branchId: BranchId;
  /** 短名，用于界面展示与错题归类。 */
  name: string;
  /** 错误陈述原句，可直接作为题干或错误选项。 */
  statement: string;
  /** 为什么这个错误具有迷惑性。 */
  appeal: string;
  /** 正确说法，用于纠错讲解与正确选项。 */
  correction: string;
  relatedNodeIds: string[];
  /** 深度演示路径上的误区会额外多生成一道补救题。 */
  deep?: boolean;
}

function m(
  id: string,
  branchId: BranchId,
  name: string,
  statement: string,
  appeal: string,
  correction: string,
  relatedNodeIds: string[],
  deep = false,
): MisconceptionEntry {
  return { id, branchId, name, statement, appeal, correction, relatedNodeIds, deep };
}

const MISCONCEPTIONS_408: MisconceptionEntry[] = [
  m('m408-thread-resource', '408', '线程资源边界', '同一进程内的线程各自拥有独立的地址空间。', '进程和线程都是“独立执行的执行流”，容易把进程的隔离特性套到线程上。', '线程共享所属进程的地址空间、代码段、数据段、堆和打开文件；私有的是栈、寄存器上下文和程序计数器。', ['knowledge-process-thread'], true),
  m('m408-thread-switch-cost', '408', '线程切换开销来源', '线程切换需要切换页表和完整地址空间。', '把进程切换的重量级操作误认为对线程同样成立。', '同进程内线程切换不切换地址空间，主要开销是保存恢复寄存器与调度；跨进程才涉及页表切换。', ['knowledge-process-thread'], true),
  m('m408-list-order', '408', '链表适用范围', '链表插入和删除不需要移动元素，因此任何场景都应优先使用链表。', '只记住了链表的插入优势，忽略了它失去随机访问的代价。', '链表按位置访问是 O(n)；需要频繁随机访问时应选择顺序表，两个结构各有适用条件。', ['knowledge-linear-list'], true),
  m('m408-tree-null', '408', '二叉树空指针数', 'n 个结点的二叉树共有 n 个空指针域。', '和“每个结点两个指针共 2n 个”混淆，忘了减去实际分支数。', 'n 个结点共有 n-1 条分支指针，因此空指针域为 2n-(n-1)=n+1 个。', ['knowledge-tree'], true),
  m('m408-graph-edges', '408', '完全图边数', 'n 个顶点的无向完全图共有 n 的平方条边。', '把顶点有序对的个数当成边数。', '无向完全图边数为 n(n-1)/2，每条边只计一次。', ['knowledge-graph'], true),
  m('m408-bst-worst', '408', '搜索树最坏情况', '二叉搜索树的查找时间复杂度总是 O(log n)。', '只记住了平衡情形，忽略了退化成链表的可能。', '二叉搜索树在退化（如有序插入）时查找退化为 O(n)，平衡树才能保证 O(log n)。', ['knowledge-search'], true),
  m('m408-hash-conflict', '408', '哈希冲突观', '哈希冲突说明哈希函数设计错误，必须完全避免。', '把“冲突率”当成“设计对错”的二值判断。', '只要关键字集合大于表长，冲突不可避免；工程上控制负载因子并选择解决策略（链地址、开放定址）。', ['knowledge-search']),
  m('m408-sort-stable', '408', '排序稳定性', '快速排序是稳定的排序算法。', '“快”和“稳”在口语上容易连在一起，形成错误联想。', '快速排序的划分交换会跨越相等元素，不稳定；归并、插入、冒泡是稳定的。', ['knowledge-sort'], true),
  m('m408-cache-tradeoff', '408', 'Cache 容量权衡', 'Cache 容量越大命中率一定越高，没有额外代价。', '只看到命中率上升，忽略命中延迟、成本与功耗的变化。', '容量增大同时提高命中延迟与硬件成本；设计要在命中率与访问速度之间权衡，并依赖局部性原理。', ['knowledge-memory-system'], true),
  m('m408-pipeline-hazard', '408', '流水线加速比', '流水线级数越多指令执行越快，不存在瓶颈。', '只看理想的每周期一条指令，忽略冒险带来的停顿。', '流水线存在数据、控制、结构冒险；级数越多冒险与冲销代价越明显，实际加速比受最慢阶段限制。', ['knowledge-instruction-system']),
  m('m408-scheduler-fair', '408', '并发与并行', '时间片轮转调度让多个进程真正同时执行。', '把宏观上的“都在推进”误当成微观上的同时运行。', '单核时间片轮转是并发（交替执行）不是并行；只有多核同时执行才是并行。', ['knowledge-process-thread']),
  m('m408-deadlock-condition', '408', '死锁解除方式', '死锁发生后抢占任意一个资源即可解除。', '把破坏“循环等待”误当成可以随意抢占。', '死锁需要互斥、占有并等待、不可抢占、循环等待四个条件同时成立；解除需破坏其一，如剥夺进程资源并回滚。', ['knowledge-process-thread', 'course-operating-systems'], true),
  m('m408-virtual-memory-size', '408', '虚拟内存容量', '虚拟地址空间的大小由物理内存大小决定。', '把“可用内存”直觉地等同于“地址空间”。', '虚拟地址空间由地址位数决定（如 48 位），可以远大于物理内存，由按需调页支撑。', ['knowledge-memory-management'], true),
  m('m408-page-fault', '408', '缺页性质', '缺页中断属于程序错误，应当完全避免。', '把“page fault”中的 fault 理解成过错。', '按需调页下缺页是正常机制，只有频繁缺页导致抖动才是性能问题。', ['knowledge-memory-management']),
  m('m408-tcp-order', '408', 'TCP 可靠性边界', 'TCP 保证数据有序且同时到达接收端。', '把“可靠”扩大成“即时”。', 'TCP 保证字节流有序递交与不丢不重，不保证同时到达，也不保证传输速率。', ['knowledge-tcp'], true),
  m('m408-tcp-handshake', '408', '握手次数必要性', '两次握手就足以建立可靠连接。', '觉得第三次 ACK 是多余的确认。', '两次握手无法防止历史失效连接请求造成的资源错配，也无法完成双方初始序号同步。', ['knowledge-tcp'], true),
  m('m408-http-stateless', '408', '连接复用与状态', 'HTTP/1.1 的持久连接让 HTTP 变成了有状态协议。', '把传输层连接的保持误当成应用层状态。', 'keep-alive 只是复用 TCP 连接减少握手开销；HTTP 协议本身仍是无状态的，状态由 Cookie 等机制补充。', ['knowledge-http'], true),
  m('m408-cache-validate', '408', '缓存协商', '强缓存过期后浏览器直接下载新资源，不再发起请求。', '以为“过期”等于“直接更新”。', '强缓存过期后浏览器发起协商请求（If-Modified-Since 等），服务器返回 304 才继续使用本地副本。', ['knowledge-http-cache'], true),
  m('m408-complexity-log', '408', '复杂度比较', 'O(log n) 一定比 O(n) 慢，因为对数运算更复杂。', '把“算起来复杂”误当成“增长更快”。', '大 O 描述增长趋势，log n 的增长远慢于 n，n 足够大时 O(log n) 更优。', ['course-data-structures']),
  m('m408-recursion-limit', '408', '递归可用性', '递归一定会栈溢出，工程中应当永远避免。', '把“可能溢出”绝对化为“必然溢出”。', '只要有基线条件且深度可控，递归是安全的；深度过大时可改写为显式栈的迭代。', ['course-data-structures']),
];

const MISCONCEPTIONS_AI: MisconceptionEntry[] = [
  m('mai-overfit-train', 'ai', '训练准确率迷信', '训练集准确率越高，模型就越好。', '训练曲线看起来“更完美”，与好模型画上了等号。', '模型质量由验证与测试集上的泛化决定；训练准确率过高往往是过拟合信号。', ['knowledge-supervised-learning'], true),
  m('mai-test-leak', 'ai', '测试集污染', '用测试集反复调参不影响最终评估的公正性。', '觉得“反正是同一批数据，看看也无妨”。', '测试集只能用于最终评估；用它调参会造成数据泄漏，让评估结果虚高。', ['knowledge-model-evaluation'], true),
  m('mai-lr-large', 'ai', '学习率权衡', '学习率越大收敛越快，没有副作用。', '把“步子大”直观地理解成“走得快”。', '学习率过大导致损失震荡甚至发散，过小收敛缓慢；需要按损失曲线调参。', ['knowledge-neural-network'], true),
  m('mai-softmax-range', 'ai', 'softmax 值域', 'softmax 的输出可以大于 1。', '只记住了“放大差异”，忘了归一化约束。', 'softmax 输出是归一化概率，每个分量在 (0,1) 且总和为 1。', ['knowledge-neural-network']),
  m('mai-transformer-position', 'ai', '位置编码必要性', 'Transformer 天然理解词序，不需要位置编码。', '自注意力“看起来读懂了句子”，误以为顺序信息内置。', '自注意力对输入是排列不变的，必须注入位置编码才能利用词序信息。', ['knowledge-transformer'], true),
  m('mai-attention-vs-rnn', 'ai', '注意力与循环', '注意力机制和循环网络只是记法不同，能力完全一样。', '两者都用于序列建模，容易混为一谈。', '自注意力支持并行计算与长程依赖直接交互，RNN 顺序传递信息，二者结构与复杂度都不同。', ['knowledge-transformer']),
  m('mai-rag-params', 'ai', 'RAG 参数更新', 'RAG 检索会把新知识写进模型参数。', '把“模型回答了新内容”误当成“模型学到了新内容”。', 'RAG 在推理时检索外部资料并拼入上下文，模型参数保持不变；更新参数是微调做的事。', ['knowledge-rag'], true),
  m('mai-embed-equivalence', 'ai', '向量相似度边界', '两个向量相似度接近 1，语义就一定相同。', '把数值近似直接当成语义等价。', '嵌入相似度是近似检索信号，存在语义漂移；需要重排与阈值过滤降低误召回。', ['knowledge-vector-database'], true),
  m('mai-retrieval-top1', 'ai', 'top-1 迷信', '向量检索排第一的文档一定是最相关的。', '默认排序等于正确。', '向量检索存在召回误差，top-1 可能被表面相似淹没；需要重排模型与 top-k 截断策略。', ['knowledge-rag', 'knowledge-vector-database']),
  m('mai-prompt-length', 'ai', '提示长度', '提示词越长、塞得越满，效果一定越好。', '以为上下文越多信息越充分。', '冗长提示引入噪声并稀释指令权重；提示应当结构化且与任务对齐。', ['knowledge-prompt-design']),
  m('mai-metrics-single', 'ai', '单一指标', '评估模型只需要看一个准确率指标。', '一个数字最容易比较，省去权衡。', '类别不平衡时准确率会失真，需结合精确率、召回率、F1 与业务指标共同评估。', ['knowledge-model-evaluation'], true),
  m('mai-batch-latency', 'ai', '批处理权衡', '增大推理批处理只会提升吞吐，没有代价。', '吞吐数字直接上升，掩盖了单请求延迟。', '批越大单请求等待时间越长；在线服务要在延迟 SLO 与吞吐之间权衡。', ['knowledge-model-serving']),
  m('mai-data-quality', 'ai', '数据数量', '数据越多效果一定越好，与质量无关。', '把大数据集直觉等同于好数据集。', '带噪声或标注错误的数据会放大偏差；数据质量与覆盖度往往比数量更关键。', ['knowledge-data-cleaning']),
  m('mai-async-speed', 'ai', '异步普适', '异步代码一定比同步代码快。', '把 IO 等待时间被隐藏误当成计算本身变快。', '异步只在 IO 密集场景隐藏等待；CPU 密集任务仍受计算时间限制。', ['knowledge-async-concurrency'], true),
  m('mai-eval-offline', 'ai', '离线评估足够', '离线指标达标，上线效果一定达标。', '把数据集表现等同于真实分布表现。', '线上分布与训练分布存在偏移，需要在线 A/B 与监控闭环验证。', ['knowledge-model-serving']),
  m('mai-finetune-vs-rag', 'ai', '知识更新路径', '想让模型知道新知识，只能重新微调。', '把参数当成唯一知识容器。', '高频变化的知识适合 RAG 外挂，稳定能力适合微调；两者按更新频率与成本选择。', ['knowledge-rag', 'knowledge-prompt-design']),
];

const MISCONCEPTIONS_GAME: MisconceptionEntry[] = [
  m('mgame-loop-unbounded', 'game', '循环速率', '游戏循环跑得越快游戏越流畅，帧率不设上限最好。', '把帧率数字当成体验本身。', '渲染与物理必须匹配固定时间步；无上限循环造成物理不稳定、功耗与发热失控。', ['knowledge-game-loop'], true),
  m('mgame-dt-scale', 'game', 'dt 缩放局限', '所有速率都乘以每帧 dt 就能正确适配不同帧率。', '线性缩放对连续量直觉上成立。', '变步长积分存在误差累积；物理模拟应使用固定时间步加插值渲染。', ['knowledge-game-loop'], true),
  m('mgame-matrix-order', 'game', '矩阵乘法顺序', '变换矩阵的乘法满足交换律，先旋转再平移和先平移再旋转结果一样。', '标量乘法交换的直觉被带到矩阵上。', '变换矩阵乘法不满足交换律；世界矩阵通常按“缩放→旋转→平移”的顺序组合。', ['knowledge-matrix-transform'], true),
  m('mgame-quaternion-euler', 'game', '四元数必要性', '四元数只是欧拉角的另一种记法，没有实质优势。', '两者都能表示旋转，看起来等价。', '欧拉角存在万向节锁与插值不均匀；四元数避免奇点、可平滑插值且组合更稳定。', ['course-game-math'], true),
  m('mgame-aabb-universal', 'game', 'AABB 适用边界', '轴对齐包围盒适合所有碰撞检测场景。', 'AABB 简单好用，容易一劳永逸化。', 'AABB 对旋转物体误差大；精细检测先用粗筛（AABB/球）再做分离轴或凸多边形检测。', ['knowledge-collision-detection'], true),
  m('mgame-tunneling', 'game', '隧穿问题', '高速运动的物体一定能被碰撞检测拦截，不会穿墙。', '默认“检测了就不会漏”。', '离散采样下高速物体会跳过薄墙（隧穿）；需要连续碰撞检测或子步模拟。', ['knowledge-collision-detection'], true),
  m('mgame-ecs-inherit', 'game', 'ECS 本质', 'ECS 就是用更深的继承树组织游戏对象。', '从面向对象直觉出发理解组合模式。', 'ECS 用组合替代继承：实体只是 id，数据在组件、行为在系统，提高缓存局部性与复用。', ['course-game-engine'], true),
  m('mgame-drawcall', 'game', 'Draw Call 成本', 'Draw Call 数量与性能无关，只与三角形数有关。', '只盯着顶点量，忽略 CPU 提交开销。', '每条 Draw Call 都有 CPU 侧验证与状态切换成本；合批与实例化是关键优化手段。', ['knowledge-rendering-pipeline'], true),
  m('mgame-pipeline-order', 'game', '渲染阶段顺序', '渲染管线的阶段顺序可以根据需要随意调整。', '把管线理解成可自由组合的工具箱。', '图形管线是固定的硬件结构：顶点处理→图元装配→光栅化→片段着色→输出合并，只能在其中编程。', ['knowledge-rendering-pipeline'], true),
  m('mgame-gc-frame', 'game', '帧内分配', '每帧分配内存不影响帧率，垃圾回收是无感的。', '托管内存让人觉得分配免费。', '帧内高频分配触发 GC 卡顿；应使用对象池与预分配缓冲。', ['knowledge-resource-management']),
  m('mgame-input-event', 'game', '输入处理方式', '轮询输入一定比事件回调差，应全部用事件。', '把“回调更优雅”当成普适结论。', '轮询适合连续动作（摇杆、按键按住），事件适合离散触发（按键按下）；按场景选择。', ['knowledge-input-system'], true),
  m('mgame-resource-sync', 'game', '同步加载', '同步加载资源只是写法问题，不影响玩家体验。', '在快机器上测不出卡顿。', '同步 IO 会阻塞主线程造成掉帧；大资源应异步加载并做依赖管理。', ['knowledge-resource-management']),
  m('mgame-physics-steps', 'game', '物理子步', '物理子步数越多模拟越准，没有代价，可以无限加大。', '精度直觉：步子越小越精确。', '子步数翻倍 CPU 成本近似翻倍；应在精度预算内选择最小子步数。', ['knowledge-collision-detection']),
  m('mgame-anim-blending', 'game', '动画混合归一', '动画混合就是对各片段权重做简单平均，不需要归一化。', '平均的直觉掩盖了权重和问题。', '混合权重需要归一化，否则总幅度随片段数漂移；交叉淡入常用平滑曲线。', ['knowledge-animation-system']),
];

const MISCONCEPTIONS_FRONTEND: MisconceptionEntry[] = [
  m('mfe-microtask-queue', 'frontend', '任务队列结构', '微任务和宏任务在同一个队列里按插入顺序执行。', '两者都叫“任务”，容易想象成一个队列。', '每轮事件循环先执行一个宏任务，然后清空整个微任务队列，再进入渲染判定。', ['knowledge-event-loop'], true),
  m('mfe-timeout-zero', 'frontend', 'setTimeout(0)', 'setTimeout(fn, 0) 会在当前同步代码后立即执行。', '参数是 0 就等于“马上”。', 'setTimeout 回调进入宏任务队列，还要等微任务清空与渲染判定，并非立即执行。', ['knowledge-event-loop'], true),
  m('mfe-react-batch', 'frontend', '自动批处理', '在事件回调和异步代码里连续调用 setState，渲染次数完全一致。', 'React 18 之前的行为被当成永久事实。', 'React 18 起事件内外都会自动批处理；旧版本里事件外每次调用触发一次渲染，行为随版本变化。', ['knowledge-react-state'], true),
  m('mfe-state-mutate', 'frontend', '状态可变性', '直接修改 state 对象更快且没有副作用。', '省去展开复制的写法看起来更轻。', 'React 靠引用比较感知更新；直接可变修改不会触发重渲染，还会污染历史状态。', ['knowledge-react-state'], true),
  m('mfe-keys-index', 'frontend', 'key 的作用', '用数组下标作 key 不会带来任何问题。', '静态列表里下标工作正常，被推广到动态列表。', '动态列表用下标作 key 会导致状态错配与错误复用；应使用稳定业务 id。', ['knowledge-react-state']),
  m('mfe-reflow-repaint', 'frontend', '重排与重绘', '改变元素颜色一定会触发重排。', '把所有样式变更笼统当成“重新排版”。', '颜色、背景变更只触发重绘；影响几何属性（宽高、位置）才触发重排，成本更高。', ['knowledge-browser-rendering'], true),
  m('mfe-cache-negotiation', 'frontend', '缓存过期行为', '强缓存过期后浏览器直接下载新资源，不会再发请求判断。', '以为“过期=重新下载”。', '过期后浏览器发起协商请求，服务器判定未变则返回 304 复用本地副本，避免重新下载。', ['knowledge-http-cache'], true),
  m('mfe-dpr-px', 'frontend', 'CSS 像素', '1px 在所有设备上对应的物理长度相同。', 'px 被当作物理单位。', 'CSS px 是逻辑单位，实际物理长度由设备像素比（DPR）决定；高 DPR 屏一个 CSS px 对应多个物理像素。', ['knowledge-css-layout'], true),
  m('mfe-aria-magic', 'frontend', '可访问性捷径', '在 div 上堆满 aria 属性，页面就自动可访问了。', 'aria 看起来是“加上就生效”的开关。', '优先使用原生语义元素；aria 是补丁不是替代，滥用会造成读屏器混乱。', ['knowledge-accessibility']),
  m('mfe-bundle-runtime', 'frontend', '分包作用范围', '代码分块只影响首屏加载，与运行时性能无关。', '把体积优化想成纯下载问题。', '更小的 chunk 也减少解析与编译成本；同时避免长任务阻塞交互。', ['knowledge-web-performance'], true),
  m('mfe-any-type', 'frontend', 'any 的代价', '用 any 简化类型与保持类型安全效果相同。', 'any 能让红线消失，看起来省事。', 'any 关闭检查并让错误跨边界传播；应该用 unknown 加收窄或泛型建模。', ['knowledge-type-system'], true),
  m('mfe-async-order', 'frontend', 'Promise 执行时机', 'then 的回调会同步在当前栈中立即执行。', '注册了回调就觉得“已经执行”。', 'then 回调进入微任务队列，在当前同步栈清空后执行；多个 then 链按注册顺序排队。', ['knowledge-event-loop'], true),
  m('mfe-critical-css', 'frontend', '渲染阻塞', 'CSS 不阻塞渲染，可以随意放到页面底部。', '只把 JS 当成阻塞源。', 'CSSOM 未就绪会阻塞渲染；首屏关键 CSS 应内联，其余异步加载。', ['knowledge-browser-rendering']),
  m('mfe-waterfall', 'frontend', '请求瀑布', '把所有请求都并行发出，页面一定更快。', '并行的直觉没有考虑依赖与带宽。', '关键链路上的请求依赖决定最短路径；无脑并行会挤占带宽并抢占关键资源，应按优先级调度。', ['knowledge-web-performance']),
];

export const MISCONCEPTIONS: MisconceptionEntry[] = [
  ...MISCONCEPTIONS_408,
  ...MISCONCEPTIONS_AI,
  ...MISCONCEPTIONS_GAME,
  ...MISCONCEPTIONS_FRONTEND,
];

export const MISCONCEPTIONS_BY_ID: ReadonlyMap<string, MisconceptionEntry> = new Map(
  MISCONCEPTIONS.map((entry) => [entry.id, entry]),
);

export const MISCONCEPTIONS_BY_BRANCH: Record<BranchId, MisconceptionEntry[]> = {
  '408': MISCONCEPTIONS_408,
  ai: MISCONCEPTIONS_AI,
  game: MISCONCEPTIONS_GAME,
  frontend: MISCONCEPTIONS_FRONTEND,
};

export const DEEP_MISCONCEPTIONS = MISCONCEPTIONS.filter((entry) => entry.deep);
