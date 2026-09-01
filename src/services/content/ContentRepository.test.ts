import { beforeEach, describe, expect, it } from 'vitest';
import { contentRepository } from './ContentRepository';
import { buildCustomContent } from '../../features/library-builder/generateCustomContent';
import { useLibraryStore, type CustomNode, type UserLibrary } from '../../store/libraryStore';

/** 蓝图 §19.1：自定义内容必须能被统一 Repository 读取，不能只保存 id。 */

const node: CustomNode = {
  id: 'cnode-test-k1',
  name: '测试知识点',
  kind: 'knowledge',
  description: '一个用于验证 Repository 读取的自定义知识点。',
  x: 0,
  y: 0,
};

function makeLibrary(): UserLibrary {
  const content = buildCustomContent([node]);
  return {
    id: 'lib-test',
    name: '测试库',
    description: '用于验证统一内容读取。',
    domain: '自定义',
    ownerType: 'user',
    nodes: [node],
    edges: [],
    sourceIds: [],
    teachingUnitIds: content.teachingUnits.map((unit) => unit.id),
    questionIds: content.questions.map((question) => question.id),
    teachingUnits: content.teachingUnits,
    teachingSteps: content.teachingSteps,
    questions: content.questions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ContentRepository：统一读取自定义内容', () => {
  beforeEach(() => {
    useLibraryStore.setState({ userLibraries: [makeLibrary()] });
  });

  it('能读取自定义教学单元', () => {
    const unit = contentRepository.getTeachingUnit('tu-cnode-test-k1');
    expect(unit).toBeDefined();
    expect(unit?.nodeId).toBe('cnode-test-k1');
    expect(unit?.stepIds.length).toBe(8);
  });

  it('能读取自定义教学步骤', () => {
    const step = contentRepository.getTeachingStep('tu-cnode-test-k1-01');
    expect(step).toBeDefined();
    expect(step?.kind).toBe('objective');
    expect(step?.unitId).toBe('tu-cnode-test-k1');
  });

  it('能读取自定义题目', () => {
    const question = contentRepository.getQuestion('q-cnode-test-k1-diag-0');
    expect(question).toBeDefined();
    expect(question?.type).toBe('single-choice');
    expect(question?.nodeIds).toContain('cnode-test-k1');
  });

  it('能按节点读取全部自定义题目', () => {
    const questions = contentRepository.getQuestionsForNode('cnode-test-k1');
    expect(questions.length).toBe(12);
    expect(questions.every((question) => question.nodeIds.includes('cnode-test-k1'))).toBe(true);
  });

  it('能按节点读取自定义教学单元', () => {
    const unit = contentRepository.getTeachingUnitForNode('cnode-test-k1');
    expect(unit?.id).toBe('tu-cnode-test-k1');
  });

  it('能读取自定义节点并映射为知识节点', () => {
    const mapped = contentRepository.getNode('cnode-test-k1');
    expect(mapped).toBeDefined();
    expect(mapped?.name).toBe('测试知识点');
    expect(mapped?.type).toBe('knowledge');
  });

  it('未命中的 id 返回 undefined / 空数组', () => {
    expect(contentRepository.getTeachingUnit('tu-not-exist')).toBeUndefined();
    expect(contentRepository.getQuestion('q-not-exist')).toBeUndefined();
    expect(contentRepository.getQuestionsForNode('cnode-not-exist')).toEqual([]);
  });
});
