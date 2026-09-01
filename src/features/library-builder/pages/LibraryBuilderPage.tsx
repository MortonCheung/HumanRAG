import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { ParseResult } from '../../../ai/library/LocalLibraryParser';
import { useLibraryStore } from '../../../store/libraryStore';
import type { BuilderStep } from '../types';
import { BUILDER_STEPS } from '../types';
import { validateLibrary } from '../validateLibrary';
import { BuilderTopBar } from '../components/BuilderTopBar';
import { BuilderTaskRail } from '../components/BuilderTaskRail';
import { SourceStep } from '../components/SourceStep';
import { GraphEditorStep } from '../components/GraphEditorStep';
import { TeachingSchemaStep } from '../components/TeachingSchemaStep';
import { QuestionGenerationStep } from '../components/QuestionGenerationStep';
import { PublishPreviewStep } from '../components/PublishPreviewStep';
import { BuilderInspector } from '../components/BuilderInspector';
import '../../library/library.css';
import '../library-builder.css';

const STEP_ORDER: BuilderStep[] = BUILDER_STEPS.map((step) => step.id);

/** 创建知识库 `/library/new`：五任务编辑器（来源 → 结构 → 教学 → 题目 → 预览）。 */
export function LibraryBuilderPage() {
  const navigate = useNavigate();
  const { libraryId } = useParams();
  const draft = useLibraryStore((state) => state.draft);
  const userLibraries = useLibraryStore((state) => state.userLibraries);
  const loadDraftFromLibrary = useLibraryStore((state) => state.loadDraftFromLibrary);
  const publishDraft = useLibraryStore((state) => state.publishDraft);
  const resetDraft = useLibraryStore((state) => state.resetDraft);

  const [step, setStep] = useState<BuilderStep>('source');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // 编辑路由载入指定知识库；新建路由只清理已发布草稿，未发布草稿刷新后继续恢复。
  useEffect(() => {
    if (libraryId) {
      const exists = userLibraries.some((library) => library.id === libraryId);
      if (exists && (draft?.id !== libraryId || draft.status === 'published')) {
        loadDraftFromLibrary(libraryId);
      }
      return;
    }
    if (draft?.status === 'published') resetDraft();
  }, [draft?.id, draft?.status, libraryId, loadDraftFromLibrary, resetDraft, userLibraries]);

  const validation = validateLibrary(draft);
  const hasStructure = (draft?.nodes.length ?? 0) > 0;
  const enabled: Record<BuilderStep, boolean> = {
    source: true,
    structure: hasStructure,
    teaching: hasStructure,
    questions: hasStructure,
    preview: hasStructure,
  };

  const stepIndex = STEP_ORDER.indexOf(step);

  function goTo(next: BuilderStep) {
    if (enabled[next]) setStep(next);
  }

  function handleSave() {
    if (validation.valid) {
      const id = publishDraft();
      if (id) navigate(`/library/${id}`);
    } else {
      setStep('preview');
    }
  }

  function stageContent() {
    switch (step) {
      case 'source':
        return <SourceStep onParsed={setParseResult} />;
      case 'structure':
        return <GraphEditorStep />;
      case 'teaching':
        return <TeachingSchemaStep />;
      case 'questions':
        return <QuestionGenerationStep />;
      case 'preview':
        return <PublishPreviewStep onGoToStep={goTo} />;
      default:
        return null;
    }
  }

  return (
    <div className="page">
      <BuilderTopBar
        name={draft?.name ?? ''}
        saveStatus={draft?.status === 'published' ? '已保存' : hasStructure ? '草稿' : '未开始'}
        onSave={handleSave}
        canSave={hasStructure}
      />

      <div className="builder">
        <BuilderTaskRail active={step} enabled={enabled} onSelect={goTo} />

        <main className="builder-stage">
          {stageContent()}
          <footer className="builder-stage__footer">
            <button
              type="button"
              className="text-button text-button--ghost"
              disabled={stepIndex === 0}
              onClick={() => goTo(STEP_ORDER[stepIndex - 1])}
            >
              <CaretLeft size={14} /> 上一步
            </button>
            {parseResult && step === 'source' && (
              <span className="builder-footer-note">已解析 {parseResult.topicCount} 个主题</span>
            )}
            <button
              type="button"
              className="text-button text-button--primary"
              disabled={stepIndex === STEP_ORDER.length - 1 || !enabled[STEP_ORDER[stepIndex + 1]]}
              onClick={() => goTo(STEP_ORDER[stepIndex + 1])}
            >
              下一步 <CaretRight size={14} />
            </button>
          </footer>
        </main>

        <BuilderInspector step={step} />
      </div>
    </div>
  );
}
