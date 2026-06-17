import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { Search, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActionItem, ActionStatus, Project, User as UserType } from '../../shared/types';
import { actionsApi } from '@/services/actionsApi';
import { usersApi } from '@/services/usersApi';
import { useAppStore } from '@/store/appStore';
import KanbanColumn from '@/components/action/KanbanColumn';
import ActionCard from '@/components/action/ActionCard';
import Select, { SelectOption } from '@/components/common/Select';
import Input from '@/components/common/Input';

const COLUMNS: Array<{ id: ActionStatus; title: string; color: 'slate' | 'amber' | 'emerald' }> = [
  { id: 'todo', title: '未开始', color: 'slate' },
  { id: 'doing', title: '进行中', color: 'amber' },
  { id: 'done', title: '已完成', color: 'emerald' },
];

const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={cn(
            'w-10 h-5 rounded-full transition-colors duration-200',
            checked ? 'bg-amber-500' : 'bg-slate-300'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
            checked && 'translate-x-5'
          )}
        />
      </div>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </label>
  );
};

const Board: React.FC = () => {
  const { currentUser } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [actionsData, projectsData, usersData] = await Promise.all([
          actionsApi.board(),
          usersApi.listProjects(),
          usersApi.listUsers(),
        ]);
        setActions(actionsData);
        setProjects(projectsData);
        setUsers(usersData);
      } catch (error) {
        console.error('加载看板数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (selectedProject) {
        const proj = projects.find(p => p.id === Number(selectedProject));
        if (proj && action.projectName !== proj.name) return false;
      }
      if (selectedAssignee && action.assigneeId !== Number(selectedAssignee)) return false;
      if (onlyMine && action.assigneeId !== currentUser.id) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        const titleMatch = action.title.toLowerCase().includes(kw);
        const descMatch = action.description?.toLowerCase().includes(kw);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });
  }, [actions, selectedProject, selectedAssignee, onlyMine, keyword, projects, currentUser.id]);

  const groupedActions = useMemo(() => {
    const groups: Record<ActionStatus, ActionItem[]> = {
      todo: [],
      doing: [],
      done: [],
    };
    filteredActions.forEach((action) => {
      groups[action.status].push(action);
    });
    return groups;
  }, [filteredActions]);

  const handleUpdateStatus = async (id: number, newStatus: ActionStatus) => {
    try {
      setUpdatingId(id);
      const prevActions = actions;
      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
      );
      await actionsApi.updateStatus(id, newStatus);
    } catch (error) {
      console.error('更新状态失败:', error);
      setActions((prev) =>
        prev.map((a) => {
          const orig = actions.find((o) => o.id === id);
          return a.id === id && orig ? { ...a, status: orig.status } : a;
        })
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const findColumnOfAction = (actionId: number): ActionStatus | null => {
    const action = actions.find((a) => `action-${a.id}` === String(actionId) || a.id === Number(String(actionId).replace('action-', '')));
    return action?.status || null;
  };

  const findDropColumn = (overId: string | null): ActionStatus | null => {
    if (!overId) return null;
    const strId = String(overId);
    if (strId === 'todo' || strId === 'doing' || strId === 'done') {
      return strId as ActionStatus;
    }
    if (strId.startsWith('action-')) {
      return findColumnOfAction(Number(strId.replace('action-', '')));
    }
    return findColumnOfAction(Number(strId));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = Number(String(active.id).replace('action-', ''));
    const targetColumn = findDropColumn(over.id as string);
    const sourceColumn = findColumnOfAction(activeId);

    if (!targetColumn || !sourceColumn || targetColumn === sourceColumn) return;

    await handleUpdateStatus(activeId, targetColumn);
  };

  const handleDragOver = (event: DragOverEvent) => {
  };

  const projectOptions: SelectOption[] = [
    { value: '', label: '全部项目' },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];

  const assigneeOptions: SelectOption[] = [
    { value: '', label: '全部责任人' },
    ...users.map((u) => ({ value: String(u.id), label: u.name })),
  ];

  const totalCount = filteredActions.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-slate-500 text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">行动项看板</h1>
            <p className="text-sm text-slate-500 mt-1">
              共 {totalCount} 个行动项 · 拖拽卡片可更改状态
            </p>
          </div>
        </div>

        <div className="card-base p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Select
              options={projectOptions}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              wrapperClassName="w-44"
            />
            <Select
              options={assigneeOptions}
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              wrapperClassName="w-44"
            />
            <Switch
              checked={onlyMine}
              onChange={setOnlyMine}
              label="仅看我的"
            />
            <div className="flex-1 min-w-[240px] ml-auto">
              <Input
                placeholder="搜索行动项标题或描述..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </div>
      </div>

      {totalCount === 0 ? (
        <div className="card-base p-16 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">暂无行动项</h3>
          <p className="text-sm text-slate-500">
            {selectedProject || selectedAssignee || onlyMine || keyword
              ? '没有符合当前筛选条件的行动项'
              : '在会议中创建的行动项会显示在这里'}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div
            className={cn(
              'grid gap-4',
              'grid-cols-1 md:grid-cols-[1fr_1.2fr_1fr]'
            )}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                actions={groupedActions[col.id]}
              >
                {groupedActions[col.id].length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                    拖拽到此处
                  </div>
                ) : (
                  groupedActions[col.id].map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onQuickCycleStatus={handleUpdateStatus}
                    />
                  ))
                )}
              </KanbanColumn>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default Board;
