import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Books, Exam, PencilSimple, ShareNetwork } from '@phosphor-icons/react';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { knowledgeGraph } from '../../../data/knowledgeGraph';
import { SYSTEM_LIBRARY_DEFS, UNIVERSITY_TEMPLATES_BY_ID } from '../../../data/v6/catalogs/knowledgeBaseCatalog';
import {
  materializeUniversityLibrary,
  materializeTemplateNodes,
  materializeTemplateEdges,
} from '../../../data/v6/generators/generateKnowledgeBase';
import { questionIdsForNode } from '../../../data/v6/generators/generateQuestionVariants';
import { contentRepository } from '../../../services/content/ContentRepository';
import { useLibraryStore } from '../../../store/libraryStore';
import type { CustomEdge, CustomNode, CustomRelationType } from '../../../store/libraryStore';
import { CustomTreeCanvas } from '../../library-builder/components/CustomTreeCanvas';
import '../library.css';

const KIND_LABELS: Record<string, string> = {
  goal: '目标',
  direction: '方向',
  skill: '技能',
  course: '课程',
  knowledge: '知识点',
  practice: '练习',
  topic: '主题',
};

interface DetailNode {
  id: string;
  name: string;
  kind: string;
  description: string;
  x: number;
  y: number;
  z: number;
  position: [number, number, number];
}
interface DetailEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
}
interface DetailData {
  id: string;
  name: string;
  description: string;
  domain: string;
  ownerType: 'system' | 'user';
  nodes: DetailNode[];
  edges: DetailEdge[];
  teachingUnits: Array<{ id: string; title: string }>;
  questions: string[];
  sources: string[];
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

/** 统一解析系统 / 用户 / 大学模板三类知识库为详情视图。 */
function resolveDetail(libraryId: string): DetailData | null {
  const system = SYSTEM_LIBRARY_DEFS.find((def) => def.id === libraryId);
  if (system) {
    const nodes = knowledgeGraph.nodes.filter((node) => node.branchId === system.branchId);
    const nodeIdSet = new Set(nodes.map((node) => node.id));
    const edges = knowledgeGraph.edges.filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target));
    return {
      id: system.id,
      name: system.name,
      description: system.description,
      domain: system.domain,
      ownerType: 'system',
      nodes: nodes.map((node) => ({
        id: node.id,
        name: node.name,
        kind: KIND_LABELS[node.type] ?? node.type,
        description: node.description,
        x: node.basePosition[0],
        y: node.basePosition[1],
        z: node.basePosition[2],
        position: [...node.basePosition],
      })),
      edges: edges.map((edge) => ({ ...edge })),
      teachingUnits: nodes.flatMap((node) => {
        const unit = contentRepository.getTeachingUnitForNode(node.id);
        return unit ? [{ id: unit.id, title: unit.title }] : [];
      }),
      questions: dedupe(nodes.flatMap((node) => questionIdsForNode(node.id))),
      sources: [],
    };
  }

  const userLibrary = useLibraryStore.getState().userLibraries.find((library) => library.id === libraryId);
  if (userLibrary) {
    return {
      id: userLibrary.id,
      name: userLibrary.name,
      description: userLibrary.description,
      domain: userLibrary.domain,
      ownerType: 'user',
      nodes: userLibrary.nodes.map((node) => ({
        id: node.id,
        name: node.name,
        kind: KIND_LABELS[node.kind] ?? node.kind,
        description: node.description,
        x: node.x,
        y: node.y,
        z: node.z ?? node.position?.[2] ?? 0,
        position: node.position ?? [node.x, node.y, node.z ?? 0],
      })),
      edges: userLibrary.edges.map((edge) => ({ ...edge })),
      teachingUnits: userLibrary.teachingUnits.map((unit) => ({ id: unit.id, title: unit.title })),
      questions: userLibrary.questionIds,
      sources: userLibrary.sourceIds,
    };
  }

  if (libraryId.startsWith('lib-univ-')) {
    const templateId = libraryId.slice('lib-'.length);
    const template = UNIVERSITY_TEMPLATES_BY_ID.get(templateId);
    if (template) {
      const materialized = materializeUniversityLibrary(templateId);
      const nodes = materializeTemplateNodes(template);
      const edges = materializeTemplateEdges(template);
      return {
        id: libraryId,
        name: template.name,
        description: template.description,
        domain: template.domain,
        ownerType: 'system',
        nodes: nodes.map((node, index) => ({
          id: node.id,
          name: node.name,
          kind: KIND_LABELS[node.kind] ?? node.kind,
          description: node.description,
          x: node.x,
          y: index === 0 ? 8 : 2,
          z: node.y,
          position: [node.x, index === 0 ? 8 : 2, node.y],
        })),
        edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, relationType: edge.relationType })),
        teachingUnits: [],
        questions: materialized?.questionIds ?? [],
        sources: materialized?.sourceIds ?? [],
      };
    }
  }

  return null;
}

type TabId = 'structure' | 'teaching' | 'questions' | 'sources';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'structure', label: '知识结构' },
  { id: 'teaching', label: '教学单元' },
  { id: 'questions', label: '题目' },
  { id: 'sources', label: '来源' },
];

/** 知识库详情 `/library/:libraryId`：概览、关系预览与四个标签（蓝图 §12）。 */
export function LibraryDetailPage() {
  const { libraryId = '' } = useParams();
  const data = useMemo(() => resolveDetail(libraryId), [libraryId]);
  const [tab, setTab] = useState<TabId>('structure');
  const [query, setQuery] = useState('');
  const [selectedGraphNodeId, setSelectedGraphNodeId] = useState<string | null>(null);

  if (!data) {
    return (
      <div className="page">
        <div className="page__inner">
          <Link className="text-button text-button--ghost" to="/library">
            <ArrowLeft size={14} /> 返回知识库
          </Link>
          <h1 className="page-title" style={{ marginTop: 20 }}>知识库不存在</h1>
          <p className="page-lead">未找到「{libraryId}」，可能已被删除。</p>
        </div>
      </div>
    );
  }

  const spatialNodes: CustomNode[] = data.nodes.map((node, index) => ({
    id: node.id,
    name: node.name,
    kind: index === 0 || node.kind === '课程' ? 'course' : node.kind === '主题' ? 'topic' : 'knowledge',
    description: node.description,
    x: node.x,
    y: node.y,
    z: node.z,
    position: node.position,
    color: index === 0 ? '#d8c58f' : ['#84abb0', '#8998b8', '#b28b82', '#89a98d'][index % 4],
  }));
  const spatialEdges: CustomEdge[] = data.edges.map((edge) => ({ ...edge, relationType: edge.relationType as CustomRelationType }));
  const normalized = query.trim().toLowerCase();
  const firstTeachingUnit = data.teachingUnits[0];
  const firstPracticeNodeId = firstTeachingUnit
    ? contentRepository.getTeachingUnit(firstTeachingUnit.id)?.nodeId
    : data.nodes.find((node) => contentRepository.getQuestionsForNode(node.id).length > 0)?.id;

  return (
    <div className="page">
      <div className="page__inner">
        <Link className="text-button text-button--ghost" to="/library">
          <ArrowLeft size={14} /> 返回知识库
        </Link>

        <div className="library-detail__head" style={{ marginTop: 22 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 6 }}>{data.name}</h1>
            <p className="page-lead" style={{ marginBottom: 0 }}>
              {data.description} <DemoDataBadge />
            </p>
          </div>
          <span className="library-detail__domain">{data.domain} · {data.ownerType === 'user' ? '自定义知识库' : '系统知识库'}</span>
        </div>

        <nav className="library-detail__actions" aria-label="知识库操作">
          <button type="button" className="text-button text-button--ghost" onClick={() => setTab('structure')}>
            <ShareNetwork size={15} /> 打开结构
          </button>
          {firstTeachingUnit ? (
            <Link className="text-button text-button--primary" to={`/teach/${firstTeachingUnit.id}`}>
              开始教学 <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="text-button is-disabled" aria-disabled="true">尚无教学单元</span>
          )}
          {firstPracticeNodeId ? (
            <Link className="text-button text-button--ghost" to={`/practice/session/node:${firstPracticeNodeId}`}>
              <Exam size={15} /> 针对本库刷题
            </Link>
          ) : (
            <span className="text-button is-disabled" aria-disabled="true">尚无可用题目</span>
          )}
          {data.ownerType === 'user' && (
            <Link className="text-button text-button--ghost" to={`/library/${data.id}/edit`}>
              <PencilSimple size={15} /> 编辑知识库
            </Link>
          )}
          {data.ownerType === 'system' && (
            <Link className="text-button text-button--ghost" to="/universe">
              在知识空间查看 <ArrowRight size={14} />
            </Link>
          )}
        </nav>

        <div className="library-detail__stats">
          <div className="library-detail__stat"><span className="library-detail__stat-value">{data.nodes.length}</span><span className="library-detail__stat-label">节点</span></div>
          <div className="library-detail__stat"><span className="library-detail__stat-value">{data.edges.length}</span><span className="library-detail__stat-label">关系</span></div>
          <div className="library-detail__stat"><span className="library-detail__stat-value">{data.teachingUnits.length}</span><span className="library-detail__stat-label">教学单元</span></div>
          <div className="library-detail__stat"><span className="library-detail__stat-value">{data.questions.length}</span><span className="library-detail__stat-label">题目</span></div>
        </div>

        <div className="grid-12" style={{ marginTop: 24 }}>
          <section className="panel" style={{ gridColumn: 'span 8' }}>
            <div className="panel__header">
              <div>
                <p className="panel-kicker">关系预览</p>
                <h3 className="panel-title">知识图谱</h3>
              </div>
            </div>
            <div className="panel__body">
              <div className="library-graph-preview">
                <CustomTreeCanvas nodes={spatialNodes} edges={spatialEdges} selectedId={selectedGraphNodeId} onSelect={setSelectedGraphNodeId} />
              </div>
            </div>
          </section>

          <section className="panel" style={{ gridColumn: 'span 4' }}>
            <div className="panel__header">
              <div>
                <p className="panel-kicker">教学覆盖</p>
                <h3 className="panel-title">覆盖缺口</h3>
              </div>
            </div>
            <div className="panel__body">
              {data.teachingUnits.length === 0 ? (
                <p className="mistake-queue__empty">尚未生成教学单元，可从「创建知识库」流程补全。</p>
              ) : (
                <div className="coverage-item">
                  <span className="coverage-item__name">已生成教学单元</span>
                  <span className="coverage-item__status is-ok">{data.teachingUnits.length} 个</span>
                </div>
              )}
              <div className="coverage-item">
                <span className="coverage-item__name">关联题目</span>
                <span className={`coverage-item__status ${data.questions.length > 0 ? 'is-ok' : 'is-missing'}`}>
                  {data.questions.length > 0 ? `${data.questions.length} 道` : '未生成'}
                </span>
              </div>
              <div className="coverage-item">
                <span className="coverage-item__name">来源资料</span>
                <span className={`coverage-item__status ${data.sources.length > 0 ? 'is-ok' : 'is-missing'}`}>
                  {data.sources.length > 0 ? `${data.sources.length} 条` : '无'}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="library-tabs">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`library-tab${tab === entry.id ? ' is-active' : ''}`}
                onClick={() => setTab(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <section className="panel" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div className="panel__body">
              <input
                className="builder-input"
                style={{ maxWidth: 320, marginBottom: 14 }}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索…"
              />

              {tab === 'structure' && (
                <div>
                  {data.nodes.filter((node) => !normalized || node.name.toLowerCase().includes(normalized)).map((node) => (
                    <div className="structure-node" key={node.id}>
                      <span>
                        <span className="structure-node__name">{node.name}</span>
                        <span className="structure-node__desc">{node.description}</span>
                      </span>
                      <span className="structure-node__kind">{node.kind}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'teaching' && (
                <div>
                  {data.teachingUnits.length === 0 && <p className="mistake-queue__empty">暂无教学单元。</p>}
                  {data.teachingUnits.filter((unit) => !normalized || unit.title.toLowerCase().includes(normalized)).map((unit) => (
                    <div className="structure-node" key={unit.id}>
                      <span>
                        <span className="structure-node__name">{unit.title}</span>
                      </span>
                      <span className="structure-node__kind">教学</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'questions' && (
                <div>
                  {data.questions.length === 0 && <p className="mistake-queue__empty">暂无题目。</p>}
                  {data.questions
                    .filter((id) => !normalized || id.toLowerCase().includes(normalized))
                    .slice(0, 120)
                    .map((id) => {
                      const question = contentRepository.getQuestion(id);
                      return (
                        <div className="structure-node" key={id}>
                          <span>
                            <span className="structure-node__name">{id}</span>
                            <span className="structure-node__desc">{question ? question.sourceLabel : '演示题目'}</span>
                          </span>
                          <span className="structure-node__kind">{question ? question.type : '演示'}</span>
                        </div>
                      );
                    })}
                  {data.questions.length > 120 && (
                    <p className="mistake-queue__empty">共 {data.questions.length} 道题，此处仅显示前 120 道。</p>
                  )}
                </div>
              )}

              {tab === 'sources' && (
                <div>
                  {data.sources.length === 0 && <p className="mistake-queue__empty">暂无来源记录。</p>}
                  {data.sources.filter((id) => !normalized || id.toLowerCase().includes(normalized)).map((id) => (
                    <div className="structure-node" key={id}>
                      <span>
                        <span className="structure-node__name"><Books size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{id}</span>
                        <span className="structure-node__desc">本地演示来源</span>
                      </span>
                      <span className="structure-node__kind">资料</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
