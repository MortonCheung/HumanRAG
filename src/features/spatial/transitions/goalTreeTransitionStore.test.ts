import { beforeEach, describe, expect, it } from 'vitest';
import { canStartGoalTreeHandoff, extractionPhaseDurationMs, GOAL_TREE_HANDOFF_MS, GOAL_TREE_STABLE_FRAME_MS, useGoalTreeTransitionStore } from './goalTreeTransitionStore';

const draft = { name: '网络巩固', description: '', pointIds: ['knowledge-tcp'], seedPointIds: ['knowledge-tcp'], reasons: { 'knowledge-tcp': ['薄弱项'] } };

beforeEach(() => useGoalTreeTransitionStore.getState().reset());

describe('目标建树转场双就绪门', () => {
  it('为成形、停稳帧和镜头交接保留连续的视觉节奏', () => {
    expect(extractionPhaseDurationMs('forming', true)).toBe(780);
    expect(GOAL_TREE_STABLE_FRAME_MS).toBe(220);
    expect(GOAL_TREE_HANDOFF_MS).toBe(620);
  });
  it('视觉与树数据缺一不可，且只在 ready 阶段允许交接', () => {
    useGoalTreeTransitionStore.getState().begin(draft);
    useGoalTreeTransitionStore.getState().markTreeReady('tree-generated');
    expect(canStartGoalTreeHandoff(useGoalTreeTransitionStore.getState())).toBe(false);

    useGoalTreeTransitionStore.getState().advance('ready');
    expect(canStartGoalTreeHandoff(useGoalTreeTransitionStore.getState())).toBe(false);
    useGoalTreeTransitionStore.getState().markVisualReady();
    expect(canStartGoalTreeHandoff(useGoalTreeTransitionStore.getState())).toBe(true);

    useGoalTreeTransitionStore.getState().startHandoff();
    expect(canStartGoalTreeHandoff(useGoalTreeTransitionStore.getState())).toBe(false);
  });

  it('新任务会清除上一棵树的就绪状态', () => {
    useGoalTreeTransitionStore.getState().begin(draft);
    useGoalTreeTransitionStore.getState().markTreeReady('old-tree');
    useGoalTreeTransitionStore.getState().markVisualReady();
    useGoalTreeTransitionStore.getState().begin({ ...draft, name: '新任务' });
    expect(useGoalTreeTransitionStore.getState()).toMatchObject({ phase: 'highlighting', treeId: null, treeReady: false, visualReady: false });
  });

  it('失败会撤回临时选点与交接状态，同时保留错误原因', () => {
    useGoalTreeTransitionStore.getState().begin(draft);
    useGoalTreeTransitionStore.getState().markTreeReady('tree-generated');
    useGoalTreeTransitionStore.getState().fail('保存失败');
    expect(useGoalTreeTransitionStore.getState()).toMatchObject({ phase: 'idle', draft: null, treeId: null, treeReady: false, visualReady: false, error: '保存失败' });
  });
});
