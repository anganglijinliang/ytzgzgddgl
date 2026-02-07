import { LucideIcon, Package } from 'lucide-react';
import clsx from 'clsx';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  title = "暂无数据",
  description = "当前没有可显示的数据",
  icon: Icon = Package,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300", className)}>
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
        <Icon className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mb-6">{description}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
