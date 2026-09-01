import { Link } from 'react-router-dom';
import { UNIVERSITY_TEMPLATES } from '../../../data/v6/catalogs/knowledgeBaseCatalog';

export function UniversityTemplateRail() {
  return (
    <section className="panel" style={{ gridColumn: 'span 12' }}>
      <div className="panel__header">
        <div>
          <p className="panel-kicker">大学知识库模板</p>
          <h3 className="panel-title">按课程导入</h3>
        </div>
      </div>
      <div className="panel__body">
        <div className="template-rail">
          {UNIVERSITY_TEMPLATES.map((template) => (
            <Link key={template.id} className="template-card" to={`/library/lib-${template.id}`}>
              <span className="template-card__domain">{template.domain}</span>
              <span className="template-card__name">{template.name}</span>
              <span className="template-card__meta">{template.nodeCount} 节点 · {template.topicCount} 主题</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
