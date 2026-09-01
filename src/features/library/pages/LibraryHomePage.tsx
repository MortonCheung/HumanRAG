import { Link } from 'react-router-dom';
import { Plus } from '@phosphor-icons/react';
import { DemoDataBadge } from '../../../components/feedback/DemoDataBadge';
import { PrimaryLibrary } from '../components/PrimaryLibrary';
import { OwnedLibraryList } from '../components/OwnedLibraryList';
import { UniversityTemplateRail } from '../components/UniversityTemplateRail';
import '../library.css';

/** 知识库首页 `/library`：一个主知识库 + 我的知识库列表 + 大学模板横向带（蓝图 §10）。 */
export function LibraryHomePage() {
  return (
    <div className="page">
      <div className="page__inner">
        <div className="library-home__head">
          <div>
            <h1 className="page-title">我的知识库</h1>
            <p className="page-lead">
              浏览预置知识库与大学课程模板，或从本地资料创建自己的知识库。 <DemoDataBadge />
            </p>
          </div>
          <Link className="text-button text-button--primary" to="/library/new">
            <Plus size={15} weight="bold" /> 创建知识库
          </Link>
        </div>

        <div className="grid-12">
          <PrimaryLibrary />
          <OwnedLibraryList />
        </div>

        <div style={{ marginTop: 20 }}>
          <UniversityTemplateRail />
        </div>
      </div>
    </div>
  );
}
