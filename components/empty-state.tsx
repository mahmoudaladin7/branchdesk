import { FolderOpen } from 'lucide-react';
export function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof FolderOpen;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
