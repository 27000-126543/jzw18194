import React from 'react';
import type { ParsedAction, ActionItem, User, ActionStatus } from '../../../shared/types';
import { cn } from '@/lib/utils';
import Avatar from '@/components/common/Avatar';
import Tag from '@/components/common/Tag';
import { Trash2 } from 'lucide-react';

export type EditableAction = Partial<ParsedAction> & Partial<ActionItem> & {
  id?: number;
  tempKey?: string;
  title: string;
  assigneeId?: number;
  assigneeName?: string;
  dueDate?: string;
  status?: ActionStatus;
  fromHistory?: boolean;
  isParsed?: boolean;
};

interface EditableActionCardProps {
  action: EditableAction;
  users: User[];
  onUpdate: (action: EditableAction) => void;
  onDelete?: () => void;
  canDelete?: boolean;
  className?: string;
}

const statusLabels: Record<ActionStatus, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
};

const statusColors: Record<ActionStatus, 'gray' | 'amber' | 'emerald'> = {
  todo: 'gray',
  doing: 'amber',
  done: 'emerald',
};

const EditableActionCard: React.FC<EditableActionCardProps> = ({
  action,
  users,
  onUpdate,
  onDelete,
  canDelete = true,
  className,
}) => {
  const isFromHistory = 'fromHistory' in action && action.fromHistory;
  const isParsed = 'isParsed' in action && action.isParsed;
  const status = (action.status as ActionStatus) || 'todo';

  const findUserByName = (name: string): User | undefined => {
    return users.find((u) => u.name === name);
  };

  const currentAssignee = (() => {
    if ('assigneeId' in action && action.assigneeId) {
      return users.find((u) => u.id === action.assigneeId);
    }
    if ('assigneeName' in action && action.assigneeName) {
      return findUserByName(action.assigneeName);
    }
    return undefined;
  })();

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = parseInt(e.target.value, 10);
    const user = users.find((u) => u.id === userId);
    onUpdate({
      ...action,
      assigneeId: userId,
      assigneeName: user?.name || '',
      assignee: user,
    } as EditableAction);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...action, title: e.target.value } as EditableAction);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...action, description: e.target.value } as EditableAction);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...action, dueDate: e.target.value || undefined } as EditableAction);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ ...action, status: e.target.value as ActionStatus } as EditableAction);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow',
        isFromHistory && 'border-l-4 border-l-indigo-400 bg-indigo-50/30',
        isParsed && 'border-l-4 border-l-amber-400 bg-amber-50/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-40">
          <label className="block text-xs text-slate-500 mb-1">责任人</label>
          <div className="relative">
            <select
              value={currentAssignee?.id || ''}
              onChange={handleAssigneeChange}
              className="w-full appearance-none pl-9 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all cursor-pointer"
            >
              <option value="" disabled>
                未分配
              </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {currentAssignee && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none">
                <Avatar name={currentAssignee.name} color={currentAssignee.avatarColor} size="sm" />
              </div>
            )}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-3 h-3 rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={action.title}
            onChange={handleTitleChange}
            placeholder="行动项标题"
            className="w-full px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
          />
          <textarea
            value={action.description || ''}
            onChange={handleDescriptionChange}
            placeholder="补充描述（可选）"
            rows={2}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all resize-none"
          />
          <div className="flex items-center gap-3">
            <div className="relative w-40">
              <input
                type="date"
                value={action.dueDate || ''}
                onChange={handleDueDateChange}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={status}
                onChange={handleStatusChange}
                className="appearance-none px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all cursor-pointer"
              >
                <option value="todo">{statusLabels.todo}</option>
                <option value="doing">{statusLabels.doing}</option>
                <option value="done">{statusLabels.done}</option>
              </select>
              <Tag variant={statusColors[status]}>{statusLabels[status]}</Tag>
            </div>
            {isFromHistory && (
              <Tag variant="indigo">
                <svg className="w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                来自上次会议
              </Tag>
            )}
            {isParsed && !isFromHistory && (
              <Tag variant="amber">
                <svg className="w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                自动识别
              </Tag>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-1.5 text-slate-300" title="解析生成的行动项无法删除">
              <Trash2 className="w-4 h-4 opacity-40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditableActionCard;
