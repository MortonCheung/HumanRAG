import { CircleDashed } from '@phosphor-icons/react';

export function DemoDataBadge({ label = '演示数据' }: { label?: string }) {
  return (
    <span className="demo-badge" title="本地演示数据，不代表真实用户统计">
      <CircleDashed size={11} weight="regular" />
      {label}
    </span>
  );
}
