import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { FileText, AlertTriangle, Calendar, Check, Circle, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, isOverdue } from '@/utils/date';
import type { ActionItem, ActionStatus } from '../../../shared/types';
import Avatar from '@/components/common/Avatar';
import Tag from '@/components/common/Tag';

interface ActionCardProps {
  action: ActionItem;
  onQuickCycleStatus?: (id: number, nextStatus: ActionStatus) => void;
}

const quickCycleMap: Record<ActionStatus, ActionStatus> = {
  todo: 'doing',
  doing: 'done',
  done: 'todo',
};

const quickCycleIcon = {
  todo: Circle,
  doing: CircleDot,
  done: Check,
};

const quickCycleLabel: Record<ActionStatus, string> = {
  todo: '点击开始',
  doing: '点击完成',
  done: '重新打开',
};

const ActionCard: React.FC<ActionCardProps> = ({ action, onQuickCycleStatus }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `action-${action.id}`,
    data: { action },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const nextStatus = quickCycleMap[action.status];
  const QuickIcon = quickCycleIcon[action.status];
  const overdue = action.overdue ?? isOverdue(action.dueDate);
  const isDone = action.status === 'done';

  const handleQuickCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickCycleStatus?.(action.id, nextStatus);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200',
        'border border-slate-100 cursor-grab active:cursor-grabbing relative group',
        isDragging && 'outline-2 outline-amber-400 shadow-lg scale-[1.02] z-50 opacity-95'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {action.projectName && (
            <Tag variant="project" color={action.projectColor} className="!text-[11px] !py-0.5 !px-2">
              {action.projectName}
            </Tag>
          )}
          {action.fromHistory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
              来自历史
            </span>
          )}
        </div>
      </div>

      <h4
        className={cn(
          'font-semibold text-slate-800 mb-1 text-sm leading-snug',
          isDone && 'line-through text-slate-400'
        )}
      >
        {action.title}
      </h4>

      {action.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {action.description}
        </p>
      )}

      {action.meetingTitle && (
        <div className="mb-3 pb-3 border-b border-slate-100">
          <a
            href={`/meetings/${action.meetingId}`}
            className="inline-flex items-center gap-1 text-xs text-navy-600 hover:text-navy-700 hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="w-3 h-3" />
            <span className="truncate max-w-[180px]">{action.meetingTitle}</span>
          </a>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={action.assignee?.name}
            size="sm"
            color={action.assignee?.avatarColor}
            className="ring-1 ring-slate-200"
          />
          <span className="text-xs text-slate-500 truncate">
            {action.assignee?.name || '未分配'}
          </span>
        </div>

        {action.dueDate && (
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
              overdue && !isDone
                ? 'bg-red-50 text-red-600'
                : 'text-slate-500'
            )}
          >
            {overdue && !isDone ? (
              <AlertTriangle className="w-3 h-3" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            <span>{formatDate(action.dueDate, 'MM月DD日')}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        title={quickCycleLabel[action.status]}
        onClick={handleQuickCycle}
        className={cn(
          'absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center',
          'transition-all duration-200 opacity-0 group-hover:opacity-100',
          'hover:scale-110',
          action.status === 'todo' && 'text-slate-400 hover:text-amber-500 hover:bg-amber-50',
          action.status === 'doing' && 'text-amber-500 hover:text-amber-600 hover:bg-amber-50',
          action.status === 'done' && 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'
        )}
      >
        <QuickIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ActionCard;
