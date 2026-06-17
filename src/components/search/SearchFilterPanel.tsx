import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, User } from '../../../shared/types';
import Avatar from '@/components/common/Avatar';

export type TimeRangeKey = 'week' | 'month' | 'quarter' | 'custom';

export interface SearchFilters {
  projectIds: number[];
  participantIds: number[];
  timeRange: TimeRangeKey;
  customDateFrom?: string;
  customDateTo?: string;
  onlyActions: boolean;
  onlyMeetings: boolean;
  matchHighlight: boolean;
}

interface SearchFilterPanelProps {
  projects: Project[];
  users: User[];
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
}

const timeRangeOptions: Array<{ key: TimeRangeKey; label: string }> = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'quarter', label: '本季' },
  { key: 'custom', label: '自定义' },
];

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
      {title}
    </h4>
    {children}
  </div>
);

const CheckItem: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}> = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-slate-50 rounded px-2 -mx-2 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400/50 focus:ring-offset-0"
    />
    <span className="text-sm text-slate-700">{children}</span>
  </label>
);

const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({
  projects,
  users,
  filters,
  onChange,
}) => {
  const toggleProject = (projectId: number) => {
    const exists = filters.projectIds.includes(projectId);
    onChange({
      projectIds: exists
        ? filters.projectIds.filter((id) => id !== projectId)
        : [...filters.projectIds, projectId],
    });
  };

  const toggleParticipant = (userId: number) => {
    const exists = filters.participantIds.includes(userId);
    onChange({
      participantIds: exists
        ? filters.participantIds.filter((id) => id !== userId)
        : [...filters.participantIds, userId],
    });
  };

  const setTimeRange = (key: TimeRangeKey) => {
    onChange({ timeRange: key });
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="sticky top-24">
        <div className="card-base p-5">
          <Section title="项目">
            <div className="space-y-0.5">
              {projects.slice(0, 3).map((project) => (
                <CheckItem
                  key={project.id}
                  checked={filters.projectIds.includes(project.id)}
                  onChange={() => toggleProject(project.id)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </span>
                </CheckItem>
              ))}
              {projects.length > 3 && (
                <button className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-700 ml-6 mt-1">
                  更多 <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </Section>

          <Section title="参会人">
            <div className="space-y-1">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 py-2 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.participantIds.includes(user.id)}
                    onChange={() => toggleParticipant(user.id)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400/50 focus:ring-offset-0 shrink-0"
                  />
                  <Avatar
                    name={user.name}
                    size="sm"
                    color={user.avatarColor}
                    className="!w-7 !h-7 !text-[11px]"
                  />
                  <span className="text-sm text-slate-700 truncate">{user.name}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="时间">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {timeRangeOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTimeRange(opt.key)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    filters.timeRange === opt.key
                      ? 'bg-navy-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filters.timeRange === 'custom' && (
              <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">开始日期</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={filters.customDateFrom || ''}
                      onChange={(e) => onChange({ customDateFrom: e.target.value })}
                      className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">结束日期</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={filters.customDateTo || ''}
                      onChange={(e) => onChange({ customDateTo: e.target.value })}
                      className="w-full pl-8 pr-2 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400/50 focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section title="高级选项">
            <div className="space-y-0.5">
              <CheckItem
                checked={filters.onlyActions}
                onChange={(v) => onChange({ onlyActions: v, onlyMeetings: v ? false : filters.onlyMeetings })}
              >
                仅看行动项
              </CheckItem>
              <CheckItem
                checked={filters.onlyMeetings}
                onChange={(v) => onChange({ onlyMeetings: v, onlyActions: v ? false : filters.onlyActions })}
              >
                仅看纪要
              </CheckItem>
              <CheckItem
                checked={filters.matchHighlight}
                onChange={(v) => onChange({ matchHighlight: v })}
              >
                匹配高亮
              </CheckItem>
            </div>
          </Section>
        </div>
      </div>
    </aside>
  );
};

export default SearchFilterPanel;
