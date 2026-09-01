/** 批次一占位页面，后续批次逐一替换为真实页面。 */
export function ComingSoonPage({ title, note }: { title: string; note: string }) {
  return (
    <div className="page">
      <div className="page__inner">
        <h1 className="page-title">{title}</h1>
        <p className="page-lead">{note}</p>
      </div>
    </div>
  );
}
