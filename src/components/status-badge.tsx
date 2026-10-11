const labels: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
  pending: '待审核',
  approved: '已通过',
  rejected: '未通过',
  accepted: '已接受',
  submitted: 'PR 待确认',
  completed: '贡献已确认',
  resolved: '已处理',
  dismissed: '已关闭',
};
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`state state-${Object.hasOwn(labels, status) ? status : 'unknown'}`}>
      {labels[status] || '待确认'}
    </span>
  );
}
