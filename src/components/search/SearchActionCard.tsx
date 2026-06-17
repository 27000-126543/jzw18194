import React from 'react';
import { CheckCircle, Circle, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchActionHit, ActionStatus } from '../../../shared/types';
import Avatar from '@/components/common/Avatar';
import HighlightText from './HighlightText';

interface SearchActionCardProps {
  hit: SearchActionHit;
  highlightEnabled?: boolean;
}

const statusConfig: Record<ActionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  todo: {
    label: '未开始',
    icon: <Circle className="w-3.5 h-3.5" />,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  doing: {
    label: '进行中',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  done: {
    label: '已完成',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

const SearchActionCard: React.FC<SearchActionCardProps> = ({ hit, highlightEnabled = true }) => {
  const config = statusConfig[hit.status];

  return (
    <article className="card-base p-5 hover:border-amber-200 transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center border-2',
            config.className
          )}
        >
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <a
              href={`/meetings/${hit.meetingId}`}
              className="flex-1 group-hover:opacity-90"
            >
              <h3 className="text-base font-semibold text-slate-800 mb-1 leading-snug group-hover:text-navy-700 transition-colors">
                <HighlightText text={hit.title} enabled={highlightEnabled} />
              </h3>
            </a>
            <span
              className={cn(
                'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
                config.className
              )}
            >
              {config.icon}
              {config.label}
            </span>
          </div>

          {hit.snippet && (
            <p className="text-sm text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <HighlightText text={hit.snippet} enabled={highlightEnabled} />
            </p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <a
              href={`/meetings/${hit.meetingId}`}
              className="inline-flex items-center gap-1.5 text-xs text-navy-600 hover:text-navy-700 hover:underline transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[200px]">{hit.meetingTitle}</span>
            </a>

            {hit.assignee && (
              <div className="flex items-center gap-2">
                <Avatar
                  name={hit.assignee.name}
                  size="sm"
                  color={hit.assignee.avatarColor}
                  className="!w-6 !h-6 !text-[10px]"
                />
                <span className="text-xs text-slate-500">{hit.assignee.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default SearchActionCard;
