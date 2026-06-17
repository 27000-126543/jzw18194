import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Loader2, FileText, ListTodo, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, User, SearchMeetingHit, SearchActionHit } from '../../shared/types';
import { searchApi } from '@/services/searchApi';
import { usersApi } from '@/services/usersApi';
import SearchFilterPanel, { SearchFilters, TimeRangeKey } from '@/components/search/SearchFilterPanel';
import SearchMeetingCard from '@/components/search/SearchMeetingCard';
import SearchActionCard from '@/components/search/SearchActionCard';

type TabKey = 'all' | 'meetings' | 'actions';

const DEFAULT_FILTERS: SearchFilters = {
  projectIds: [],
  participantIds: [],
  timeRange: 'week',
  customDateFrom: undefined,
  customDateTo: undefined,
  onlyActions: false,
  onlyMeetings: false,
  matchHighlight: true,
};

function getDateRangeFromTimeRange(timeRange: TimeRangeKey, customFrom?: string, customTo?: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (timeRange) {
    case 'week': {
      const d = new Date();
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today };
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today };
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const d = new Date(now.getFullYear(), quarter * 3, 1);
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today };
    }
    case 'custom':
      return { dateFrom: customFrom, dateTo: customTo };
    default:
      return {};
  }
}

function parseIdList(v: string | null): number[] {
  if (!v) return [];
  return v.split(',').map((s) => parseInt(s, 10)).filter((n) => !isNaN(n) && n > 0);
}

function readUrlFilters(params: URLSearchParams): { keyword: string; filters: SearchFilters; tab: TabKey } {
  const keyword =
    (params.get('q') || params.get('keyword') || params.get('query') || params.get('search') || '').trim();

  const projectIds = parseIdList(params.get('projects') || params.get('projectIds'));
  const participantIds = parseIdList(params.get('participants') || params.get('participantIds'));

  const rawTime = params.get('time') || params.get('timeRange') || '';
  const timeRange: TimeRangeKey = (['week', 'month', 'quarter', 'custom'].includes(rawTime) ? rawTime : 'week') as TimeRangeKey;

  const customDateFrom = params.get('from') || params.get('dateFrom') || undefined;
  const customDateTo = params.get('to') || params.get('dateTo') || undefined;

  const rawTab = params.get('tab') || '';
  const tab: TabKey = (['all', 'meetings', 'actions'].includes(rawTab) ? rawTab : 'all') as TabKey;

  return {
    keyword,
    filters: {
      ...DEFAULT_FILTERS,
      projectIds,
      participantIds,
      timeRange,
      customDateFrom: timeRange === 'custom' ? customDateFrom : undefined,
      customDateTo: timeRange === 'custom' ? customDateTo : undefined,
    },
    tab,
  };
}

function buildUrlParams(keyword: string, filters: SearchFilters, tab: TabKey): Record<string, string> {
  const p: Record<string, string> = {};
  if (keyword) p.q = keyword;
  if (filters.projectIds.length > 0) p.projects = filters.projectIds.join(',');
  if (filters.participantIds.length > 0) p.participants = filters.participantIds.join(',');
  if (filters.timeRange !== 'week') p.time = filters.timeRange;
  if (filters.timeRange === 'custom' && filters.customDateFrom) p.from = filters.customDateFrom;
  if (filters.timeRange === 'custom' && filters.customDateTo) p.to = filters.customDateTo;
  if (tab !== 'all') p.tab = tab;
  return p;
}

const EmptyState: React.FC<{ hasSearched: boolean }> = ({ hasSearched }) => (
  <div className="card-base p-16 text-center">
    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-50 flex items-center justify-center">
      <SearchIcon className="w-12 h-12 text-slate-300" />
    </div>
    {hasSearched ? (
      <>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">未找到相关结果</h3>
        <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
          试试调整关键词，或清除筛选条件扩大搜索范围
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>💡 建议：</span>
          <ul className="list-disc list-inside space-y-1 text-left">
            <li>检查关键词拼写</li>
            <li>使用更宽泛的关键词</li>
            <li>清除项目或时间筛选</li>
          </ul>
        </div>
      </>
    ) : (
      <>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">输入关键词开始搜索</h3>
        <p className="text-sm text-slate-500">
          在所有会议纪要和行动项中搜索内容
        </p>
      </>
    )}
  </div>
);

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = useMemo(() => readUrlFilters(searchParams), []);

  const [query, setQuery] = useState(initial.keyword);
  const [inputValue, setInputValue] = useState(initial.keyword);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initial.keyword);

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<SearchMeetingHit[]>([]);
  const [actions, setActions] = useState<SearchActionHit[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>(initial.tab);
  const [filters, setFilters] = useState<SearchFilters>(initial.filters);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [projectsData, usersData] = await Promise.all([
          usersApi.listProjects(),
          usersApi.listUsers(),
        ]);
        setProjects(projectsData);
        setUsers(usersData);
      } catch (error) {
        console.error('加载元数据失败:', error);
      }
    };
    fetchMeta();
  }, []);

  const syncUrl = useCallback((keyword: string, f: SearchFilters, tab: TabKey) => {
    const p = buildUrlParams(keyword, f, tab);
    setSearchParams(p, { replace: true });
  }, [setSearchParams]);

  const doSearch = useCallback(async (keyword: string, currentFilters: SearchFilters) => {
    if (!keyword.trim()) {
      setMeetings([]);
      setActions([]);
      setHasSearched(false);
      return;
    }
    try {
      setLoading(true);
      const { dateFrom, dateTo } = getDateRangeFromTimeRange(
        currentFilters.timeRange,
        currentFilters.customDateFrom,
        currentFilters.customDateTo
      );
      const response = await searchApi.search({
        keyword: keyword.trim(),
        projectIds: currentFilters.projectIds.length > 0 ? currentFilters.projectIds : undefined,
        participantIds: currentFilters.participantIds.length > 0 ? currentFilters.participantIds : undefined,
        dateFrom,
        dateTo,
      });
      setMeetings(response.meetings);
      setActions(response.actions);
      setHasSearched(true);
    } catch (error) {
      console.error('搜索失败:', error);
      setMeetings([]);
      setActions([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial.keyword) {
      doSearch(initial.keyword, initial.filters);
    }
  }, []);

  useEffect(() => {
    if (!hasSearched || !query) return;
    doSearch(query, filters);
  }, [filters, query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = inputValue.trim();
    setQuery(kw);
    if (kw) {
      doSearch(kw, filters);
      syncUrl(kw, filters, activeTab);
    } else {
      setHasSearched(false);
      setMeetings([]);
      setActions([]);
      setSearchParams({});
    }
  };

  const handleFiltersChange = (partial: Partial<SearchFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      if (partial.onlyActions) next.onlyMeetings = false;
      if (partial.onlyMeetings) next.onlyActions = false;
      return next;
    });
  };

  useEffect(() => {
    if (query) {
      syncUrl(query, filters, activeTab);
    }
  }, [filters, activeTab, query]);

  const showMeetings = activeTab !== 'actions' && !filters.onlyActions;
  const showActions = activeTab !== 'meetings' && !filters.onlyMeetings;

  const totalMeetings = meetings.length;
  const totalActions = actions.length;

  const displayedCount = useMemo(() => {
    if (activeTab === 'meetings') return totalMeetings;
    if (activeTab === 'actions') return totalActions;
    return totalMeetings + totalActions;
  }, [activeTab, totalMeetings, totalActions]);

  const tabs: Array<{ key: TabKey; label: string; count: number; icon: React.ReactNode }> = [
    { key: 'all', label: '全部', count: totalMeetings + totalActions, icon: null },
    { key: 'meetings', label: '纪要', count: totalMeetings, icon: <FileText className="w-4 h-4" /> },
    { key: 'actions', label: '行动项', count: totalActions, icon: <ListTodo className="w-4 h-4" /> },
  ];

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
  };

  const MobileFilterOverlay = showMobileFilter && (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={() => setShowMobileFilter(false)}
      />
      <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl overflow-y-auto lg:hidden animate-fade-in-up">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">筛选条件</h3>
          <button
            onClick={() => setShowMobileFilter(false)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          <SearchFilterPanel
            projects={projects}
            users={users}
            filters={filters}
            onChange={handleFiltersChange}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="animate-fade-in-up">
      {MobileFilterOverlay}

      <div className="mb-8">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="搜索会议纪要、行动项..."
              className={cn(
                'w-full pl-14 pr-5 py-4 text-lg rounded-2xl',
                'border-2 border-slate-200 bg-white',
                'shadow-lg shadow-slate-200/50',
                'placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400',
                'transition-all duration-200'
              )}
            />
            {loading && (
              <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin" />
            )}
          </div>
          {query && hasSearched && !loading && (
            <p className="text-center text-sm text-slate-500 mt-3">
              找到 <span className="font-semibold text-slate-700">{displayedCount}</span> 条与「
              <span className="text-navy-600 font-medium">{query}</span>」相关的结果
              {activeTab === 'all' && (
                <span className="ml-1">（纪要 {totalMeetings} / 行动项 {totalActions}）</span>
              )}
            </p>
          )}
        </form>
      </div>

      <div className="flex gap-6">
        <SearchFilterPanel
          projects={projects}
          users={users}
          filters={filters}
          onChange={handleFiltersChange}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5',
                    activeTab === tab.key
                      ? 'bg-navy-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  <span
                    className={cn(
                      'min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center',
                      activeTab === tab.key
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowMobileFilter(true)}
              className="lg:hidden inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              筛选
            </button>
          </div>

          {!hasSearched ? (
            <EmptyState hasSearched={false} />
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card-base p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-slate-100 rounded w-2/3" />
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                      <div className="h-16 bg-slate-100 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedCount === 0 ? (
            <EmptyState hasSearched={true} />
          ) : (
            <div className="space-y-4">
              {showMeetings && meetings.length > 0 && (
                <>
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">
                      <FileText className="w-4 h-4" />
                      会议纪要 ({totalMeetings})
                    </div>
                  )}
                  <div className="space-y-4">
                    {meetings.map((hit) => (
                      <SearchMeetingCard
                        key={hit.id}
                        hit={hit}
                        highlightEnabled={filters.matchHighlight}
                      />
                    ))}
                  </div>
                </>
              )}

              {showActions && actions.length > 0 && (
                <>
                  {activeTab === 'all' && totalMeetings > 0 && totalActions > 0 && (
                    <div className="h-px bg-slate-200 my-2" />
                  )}
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2">
                      <ListTodo className="w-4 h-4" />
                      行动项 ({totalActions})
                    </div>
                  )}
                  <div className="space-y-4">
                    {actions.map((hit) => (
                      <SearchActionCard
                        key={hit.id}
                        hit={hit}
                        highlightEnabled={filters.matchHighlight}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
