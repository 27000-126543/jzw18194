import React from 'react';
import { cn } from '@/lib/utils';

type ColumnColor = 'slate' | 'amber' | 'emerald';

interface KanbanColumnProps {
  id: string;
  title: string;
  color?: ColumnColor;
  actions?: Array<{ id: number; title: string }>;
  children?: React.ReactNode;
  className?: string;
}

const headerBg: Record<ColumnColor, string> = {
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
};

const badgeBg: Record<ColumnColor, string> = {
  slate: 'bg-white/25 text-white',
  amber: 'bg-white/25 text-white',
  emerald: 'bg-white/25 text-white',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  id,
  title,
  color = 'slate',
  actions = [],
  children,
  className,
}) => {
  return (
    <div
      id={id}
      data-column-id={id}
      className={cn('flex flex-col', className)}
    >
      <div
        className={cn(
          'px-4 py-2 rounded-t-lg flex items-center justify-between',
          headerBg[color]
        )}
      >
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span
          className={cn(
            'min-w-[24px] h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center',
            badgeBg[color]
          )}
        >
          {actions.length}
        </span>
      </div>
      <div
        className={cn(
          'bg-slate-50 min-h-[400px] p-3 rounded-b-lg flex flex-col gap-3',
          'border border-t-0 border-slate-200'
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default KanbanColumn;
