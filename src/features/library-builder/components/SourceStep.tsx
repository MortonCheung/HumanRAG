import { useState } from 'react';
import { Plus, Sparkle } from '@phosphor-icons/react';
import { parseSource, draftFromTemplate, simulatedLatency, type ParseResult } from '../../../ai/library/LocalLibraryParser';
import { UNIVERSITY_TEMPLATES } from '../../../data/v6/catalogs/knowledgeBaseCatalog';
import { useLibraryStore } from '../../../store/libraryStore';
import { buildInitialEdges, buildNodesFromTopics } from '../generateCustomContent';

/** 来源步骤：命名、粘贴文本 / 文件名、解析、或从 48 个大学模板载入（蓝图 §11.2）。 */
export function SourceStep({ onParsed }: { onParsed: (result: ParseResult) => void }) {
  const createDraft = useLibraryStore((state) => state.createDraft);
  const updateDraft = useLibraryStore((state) => state.updateDraft);

  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [templateId, setTemplateId] = useState(UNIVERSITY_TEMPLATES[0].id);

  function applyResult(result: ParseResult, finalName: string) {
    const nodes = buildNodesFromTopics(finalName, result.topics);
    const edges = buildInitialEdges(nodes);
    createDraft(finalName);
    updateDraft({
      name: finalName,
      description: result.description,
      domain: result.domain,
      sourceIds: result.matchedTemplateId ? [`template-${result.matchedTemplateId}`] : ['source-pasted'],
      nodes,
      edges,
    });
    setParsed(result);
    onParsed(result);
  }

  function handleParse() {
    const finalName = name.trim() || '未命名知识库';
    setParsing(true);
    window.setTimeout(() => {
      const result = parseSource({ text, fileName });
      applyResult(result, finalName);
      setParsing(false);
    }, simulatedLatency(`${finalName}:${text}:${fileName}`));
  }

  async function handleFile(file: File | undefined) {
    if (!file) {
      setFileName('');
      setFileError('');
      return;
    }
    setFileName(file.name);
    try {
      const content = await file.text();
      setText(content);
      setFileError('');
    } catch {
      setFileError('无法读取这个文件，请改用 UTF-8 编码的 .txt、.md、.json 或 .csv 文件。');
    }
  }

  function handleTemplate() {
    const result = draftFromTemplate(templateId);
    if (!result) return;
    applyResult(result, result.name);
  }

  function handleBlank() {
    const finalName = name.trim() || '我的知识库';
    applyResult({
      name: finalName,
      description: '从空白结构开始创建的个人知识库。',
      domain: '自定义',
      matchedTemplateId: null,
      topicCount: 0,
      nodeCount: 1,
      topics: [],
    }, finalName);
  }

  return (
    <div className="builder-stage__scroll">
      <p className="builder-step__kicker">来源</p>
      <h2 className="builder-step__title">从资料或模板开始</h2>
      <div className="builder-step__body">
        <div className="builder-field">
          <label htmlFor="lib-name">知识库名称</label>
          <input
            id="lib-name"
            className="builder-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：数据库系统"
          />
        </div>

        <div className="builder-field">
          <label htmlFor="lib-text">粘贴资料文本（可选）</label>
          <textarea
            id="lib-text"
            className="builder-textarea"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="粘贴课程大纲、笔记或目录，系统会按关键词匹配最接近的知识结构。"
          />
        </div>

        <div className="builder-field">
          <label htmlFor="lib-file">导入本地资料（可选）</label>
          <input
            id="lib-file"
            className="builder-input"
            type="file"
            accept=".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          {fileName && <small className="builder-field__hint">已读取：{fileName}</small>}
          {fileError && <small className="builder-field__error" role="alert">{fileError}</small>}
        </div>

        <div className="builder-source-actions">
          <button className="text-button text-button--primary" type="button" onClick={handleParse} disabled={parsing}>
            <Sparkle size={15} weight="fill" /> {parsing ? '解析中…' : '解析资料'}
          </button>
          <button className="text-button text-button--ghost" type="button" onClick={handleBlank}>
            <Plus size={15} /> 从空白知识库开始
          </button>
        </div>

        {parsed && (
          <div className="builder-parse-result">
            <span className="builder-parse-result__match">
              {parsed.matchedTemplateId ? `已匹配模板：${parsed.name}` : '未匹配模板，已生成通用结构'}
            </span>
            <span className="builder-parse-result__meta">
              {parsed.domain} · {parsed.topicCount} 主题 · {parsed.nodeCount} 节点
            </span>
            <ul className="builder-topic-list">
              {parsed.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="builder-divider" />

      <p className="builder-step__kicker">或选择模板</p>
      <div className="builder-step__body builder-template-pick">
        <div className="builder-field">
          <label htmlFor="lib-template">大学课程模板（48 个）</label>
          <select
            id="lib-template"
            className="builder-input"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {UNIVERSITY_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.domain}
              </option>
            ))}
          </select>
        </div>
        <button className="text-button text-button--ghost" type="button" onClick={handleTemplate}>
          载入模板草稿
        </button>
      </div>
    </div>
  );
}
