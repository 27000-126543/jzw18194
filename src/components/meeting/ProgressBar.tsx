import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  todo: number;
  doing: number;
  done: number;
  total: number;
  className?: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  todo,
  doing,
  done,
  total,
  className,
  showLabel = true,
}) => {
  const todoPercent = total > 0 ? (todo / total) * 100 : 0;
  const doingPercent = total > 0 ? (doing / total) * 100 : 0;
  const donePercent = total > 0 ? (done / total) * 100 : 0;
  const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
        {donePercent > 0 && (
          <div
            className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
            style={{ width: `${donePercent}%` }}
          />
        )}
        {doingPercent > 0 && (
          <div
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${doingPercent}%` }}
          />
        )}
        {todoPercent > 0 && (
          <div
            className={cn(
              'h-full bg-slate-200 transition-all duration-300',
              doingPercent === 0 && donePercent === 0 ? 'rounded-l-full' : '',
              'rounded-r-full'
            )}
            style={{ width: `${todoPercent}%` }}
          />
        )}
      </div>
      {showLabel && (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-sm font-semibold text-navy-700">
            {done}/{total}
          </span>
          <span className="text-sm text-slate-500">({completionPercent}%)</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
