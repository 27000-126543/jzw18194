import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ListTodo,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meeting, Project, User, StatsResponse } from '@/types';
import { meetingsApi } from '@/services/meetingsApi';
import { usersApi } from '@/services/usersApi';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import DatePicker from '@/components/common/DatePicker';
import Tag from '@/components/common/Tag';
import Avatar from '@/components/common/Avatar';
import MeetingCard from '@/components/meeting/MeetingCard';

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  subtitle: string;
  iconBg: string;
  valueColor: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  subtitle,
  iconBg,
  valueColor,
}) => {
  return (
    <div className="card-base p-5">
      <div className="flex items-start gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('text-3xl font-bold tracking-tight', valueColor)}>
            {value}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        </div>
      </div>
    </div>
  );
};

const StatCardSkeleton: React.FC = () => {
  return (
    <div className="card-base p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-16 bg-slate-100 rounded animate-pulse" />
          <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const MeetingCardSkeleton: React.FC = () => {
  return (
    <div className="card-base p-5">
      <div className="flex items-start gap-5">
        <div className="flex-1 space-y-3">
          <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="w-32 flex justify-center">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 ring-2 ring-white animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-100 ring-2 ring-white animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-slate-100 ring-2 ring-white animate-pulse" />
          </div>
        </div>
        <div className="w-64 shrink-0 space-y-4">
          <div className="h-2 bg-slate-100 rounded-full animate-pulse" />
          <div className="h-8 bg-slate-50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const ParticipantChip: React.FC<{
  user: User;
  selected: boolean;
  onToggle: (id: number) => void;
}> = ({ user, selected, onToggle }) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(user.id)}
      className={cn(
        'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all duration-200 border-2',
        selected
          ? 'bg-navy-50 border-navy-500'
          : 'bg-white border-slate-200 hover:border-slate-300'
      )}
    >
      <Avatar name={user.name} size="sm" color={user.avatarColor} className="ring-0 !w-7 !h-7 text-[11px]" />
      <span
        className={cn(
          'text-xs font-medium',
          selected ? 'text-navy-700' : 'text-slate-600'
        )}
      >
        {user.name}
      </span>
    </button>
  );
};

const DEFAULT_STATS: StatsResponse = {
  totalMeetings: 0,
  pendingActions: 0,
  weeklyCompletionRate: 0,
  overdueActions: 0,
  weeklyDelta: { meetings: 0, pending: 0, completion: 0, overdue: 0 },
};

const MeetingsList: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsResponse>(DEFAULT_STATS);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showParticipantFilter, setShowParticipantFilter] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const statsRes = await meetingsApi.stats();
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats(DEFAULT_STATS);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, projectsRes, usersRes] = await Promise.all([
          meetingsApi.stats().catch(() => DEFAULT_STATS),
          usersApi.listProjects(),
          usersApi.listUsers(),
        ]);
        setStats(statsRes);
        setProjects(projectsRes);
        setUsers(usersRes);
      } catch (error) {
        console.error('Failed to load data:', error);
        setStats(DEFAULT_STATS);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const loadFilteredMeetings = async () => {
      try {
        const params: {
          projectId?: number;
          participantId?: number;
          keyword?: string;
          from?: string;
          to?: string;
        } = {};
        if (selectedProjectIds.length === 1) {
          params.projectId = selectedProjectIds[0];
        }
        if (selectedParticipantIds.length === 1) {
          params.participantId = selectedParticipantIds[0];
        }
        if (searchKeyword.trim()) {
          params.keyword = searchKeyword.trim();
        }
        if (dateFrom) {
          params.from = dateFrom;
        }
        if (dateTo) {
          params.to = dateTo;
        }
        const meetingsRes = await meetingsApi.list(params);
        setMeetings(meetingsRes);
      } catch (error) {
        console.error('Failed to load meetings:', error);
      }
    };

    if (projects.length > 0 && users.length > 0) {
      loadFilteredMeetings();
    }
  }, [selectedProjectIds, selectedParticipantIds, dateFrom, dateTo, searchKeyword, projects.length, users.length]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (selectedProjectIds.length > 1 && !selectedProjectIds.includes(m.projectId)) {
        return false;
      }
      if (selectedParticipantIds.length > 1) {
        const hasParticipant = selectedParticipantIds.some((pid) =>
          m.participantIds.includes(pid)
        );
        if (!hasParticipant) return false;
      }
      return true;
    });
  }, [meetings, selectedProjectIds, selectedParticipantIds]);

  const handleProjectToggle = (id: number) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleParticipantToggle = (id: number) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleClearFilters = () => {
    setSelectedProjectIds([]);
    setSelectedParticipantIds([]);
    setDateFrom('');
    setDateTo('');
    setSearchKeyword('');
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    if (!window.confirm(`确定要删除「${meeting.title}」吗？`)) return;
    try {
      await meetingsApi.remove(meeting.id);
      setMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
      await loadStats();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
    }
  };

  const hasActiveFilters =
    selectedProjectIds.length > 0 ||
    selectedParticipantIds.length > 0 ||
    !!dateFrom ||
    !!dateTo ||
    !!searchKeyword.trim();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={<FileText className="w-6 h-6 text-navy-100" />}
              value={stats?.totalMeetings ?? 0}
              subtitle="纪要总数"
              iconBg="bg-gradient-to-br from-navy-600 to-navy-800"
              valueColor="text-amber-500"
            />
            <StatCard
              icon={<ListTodo className="w-6 h-6 text-navy-100" />}
              value={stats?.pendingActions ?? 0}
              subtitle="待办行动项"
              iconBg="bg-gradient-to-br from-navy-600 to-navy-800"
              valueColor="text-amber-500"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6 text-navy-100" />}
              value={`${stats?.weeklyCompletionRate ?? 0}%`}
              subtitle="本周完成率"
              iconBg="bg-gradient-to-br from-navy-600 to-navy-800"
              valueColor="text-amber-500"
            />
            <StatCard
              icon={<AlertTriangle className="w-6 h-6 text-navy-100" />}
              value={stats?.overdueActions ?? 0}
              subtitle="逾期项数"
              iconBg="bg-gradient-to-br from-navy-600 to-navy-800"
              valueColor="text-amber-500"
            />
          </>
        )}
      </div>

      <div className="card-base p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜索纪要、项目或参会人..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            wrapperClassName="w-full md:w-72"
          />

          <DatePicker
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            wrapperClassName="w-full md:w-44"
          />
          <div className="text-slate-400 hidden md:block">至</div>
          <DatePicker
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            wrapperClassName="w-full md:w-44"
          />

          <div className="relative">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Users className="w-4 h-4" />}
              onClick={() => setShowParticipantFilter((prev) => !prev)}
              className={cn(
                selectedParticipantIds.length > 0 && '!bg-navy-50 !border-navy-500'
              )}
            >
              参会人
              {selectedParticipantIds.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-navy-600 text-white text-[10px] font-bold">
                  {selectedParticipantIds.length}
                </span>
              )}
            </Button>

            {showParticipantFilter && (
              <div className="absolute top-full mt-2 left-0 w-80 max-h-72 overflow-y-auto scrollbar-thin bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-40 animate-fade-in-up">
                <div className="flex flex-wrap gap-2">
                  {users.map((user) => (
                    <ParticipantChip
                      key={user.id}
                      user={user}
                      selected={selectedParticipantIds.includes(user.id)}
                      onToggle={handleParticipantToggle}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<X className="w-4 h-4" />}
              onClick={handleClearFilters}
            >
              清除筛选
            </Button>
          )}

          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/meetings/new')}
          >
            新建会议
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            项目：
          </span>
          {projects.map((project) => {
            const isSelected = selectedProjectIds.includes(project.id);
            return (
              <Tag
                key={project.id}
                variant={isSelected ? 'project' : 'gray'}
                color={isSelected ? project.color : undefined}
                closable={isSelected}
                onClose={() => handleProjectToggle(project.id)}
                className={cn(
                  'cursor-pointer transition-all',
                  !isSelected && 'hover:bg-slate-200'
                )}
                onClick={() => !isSelected && handleProjectToggle(project.id)}
              >
                {project.name}
              </Tag>
            );
          })}
          {projects.length === 0 && (
            <span className="text-xs text-slate-400">暂无项目</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <MeetingCardSkeleton />
            <MeetingCardSkeleton />
            <MeetingCardSkeleton />
          </>
        ) : filteredMeetings.length === 0 ? (
          <div className="card-base py-16 px-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">
                {hasActiveFilters ? '未找到匹配的会议纪要' : '暂无会议纪要'}
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                {hasActiveFilters
                  ? '试试调整筛选条件或清除筛选'
                  : '点击右上角按钮创建您的第一个会议纪要'}
              </p>
              {!hasActiveFilters && (
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate('/meetings/new')}
                >
                  新建会议
                </Button>
              )}
            </div>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onDelete={handleDeleteMeeting}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MeetingsList;
