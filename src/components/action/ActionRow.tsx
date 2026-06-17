import React from 'react';
import { Check, Clock, Circle, AlertTriangle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionItem, ActionStatus } from '@/types';
import Avatar from '@/components/common/Avatar';
import Tag from '@/components/common/Tag';
import { formatDate, isOverdue } from '@/utils/date';

interface ActionRowProps {
  action: ActionItem;
  onStatusChange?: (id: number, status: ActionStatus) => void;
  compact?: boolean;
  className?: string;
}

const STATUS_CYCLE: ActionStatus[] = ['todo', 'doing', 'done'];

const ActionRow: React.FC<ActionRowProps> = ({
  action,
  onStatusChange,
  compact = false,
  className,
}) => {
  const isDone = action.status === 'done';
  const isDoing = action.status === 'doing';
  const actionOverdue = action.overdue || isOverdue(action.dueDate);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange) return;
    const currentIdx = STATUS_CYCLE.indexOf(action.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    onStatusChange(action.id, nextStatus);
  };

  const renderStatusButton = () => {
    if (isDone) {
      return (
        <button
          onClick={handleStatusClick}
          className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shrink-0"
          title="已完成"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      );
    }

    if (isDoing) {
      return (
        <button
          onClick={handleStatusClick}
          className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center hover:bg-amber-50 transition-colors shrink-0 relative overflow-hidden"
          title="进行中"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-400/50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)' }} />
          <Clock className="w-3 h-3 text-amber-600 relative z-10" />
        </button>
      );
    }

    return (
      <button
        onClick={handleStatusClick}
        className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-navy-500 hover:bg-navy-50 transition-colors shrink-0"
        title="未开始"
      >
        <Circle className="w-3 h-3 text-slate-300" />
      </button>
    );
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 py-2', className)}>
        {renderStatusButton()}
        <span className={cn(
          'flex-1 text-sm',
          isDone ? 'text-slate-400 line-through' : 'text-slate-800'
        )}>
          {action.title}
        </span>
        {action.assignee && (
          <Avatar
            name={action.assignee.name}
            size="sm"
            color={action.assignee.avatarColor}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'card-base p-4 hover:shadow-md transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">{renderStatusButton()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h4
              className={cn(
                'text-sm font-medium flex-1',
                isDone ? 'text-slate-400 line-through' : 'text-slate-800'
              )}
            >
              {action.title}
            </h4>
            {action.fromHistory && (
              <Tag variant="violet" className="shrink-0">
                <History className="w-3 h-3" />
                关联历史
              </Tag>
            )}
          </div>

          {(action.description || action.meetingTitle) && (
            <div className="mt-1.5 space-y-1">
              {action.description && (
                <p className={cn(
                  'text-xs',
                  isDone ? 'text-slate-300' : 'text-slate-500'
                )}>
                  {action.description}
                </p>
              )}
              {action.meetingTitle && (
                <a
                  href={`/meetings/${action.meetingId}`}
                  className={cn(
                    'text-xs inline-flex items-center gap-1 hover:underline',
                    isDone ? 'text-slate-300' : 'text-navy-600 hover:text-navy-700'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  来源：{action.meetingTitle}
                </a>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {action.assignee && (
            <div className="flex flex-col items-center gap-1">
              <Avatar
                name={action.assignee.name}
                size="sm"
                color={action.assignee.avatarColor}
                className="ring-0"
              />
              <span className="text-[10px] text-slate-500 max-w-[60px] truncate">
                {action.assignee.name}
              </span>
            </div>
          )}

          {action.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                isDone
                  ? 'bg-slate-50 text-slate-400'
                  : actionOverdue
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-slate-50 text-slate-600'
              )}
            >
              {actionOverdue && !isDone && (
                <AlertTriangle className="w-3 h-3" />
              )}
              {formatDate(action.dueDate, 'MM月DD日')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActionRow;
