import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  ActionItem,
  Project,
  User,
  ActionStatus,
} from '../../shared/types';
import { cn } from '@/lib/utils';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import DatePicker from '@/components/common/DatePicker';
import Button from '@/components/common/Button';
import Avatar from '@/components/common/Avatar';
import Tag from '@/components/common/Tag';
import MentionEditor from '@/components/meeting/MentionEditor';
import EditableActionCard, { EditableAction } from '@/components/action/EditableActionCard';
import { meetingsApi } from '@/services/meetingsApi';
import { usersApi } from '@/services/usersApi';
import { useAppStore } from '@/store/appStore';
import { parseActions } from '@/utils/mentionParser';
import {
  ArrowLeft,
  Save,
  Mail,
  AlertCircle,
  Clock,
  UserRound,
  History,
  CheckSquare,
  Sparkles,
  Info,
} from 'lucide-react';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface ActionOverride {
  id?: number;
  tempKey?: string;
  title: string;
  assigneeId: number;
  dueDate?: string;
  status?: ActionStatus;
  description?: string;
}

const MeetingEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const isNew = id === 'new';
  const meetingId = !isNew ? parseInt(id!, 10) : null;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [meetingDate, setMeetingDate] = useState(todayISO());
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [discussionPoints, setDiscussionPoints] = useState('');
  const [decisions, setDecisions] = useState('');

  const [unfinishedSiblings, setUnfinishedSiblings] = useState<ActionItem[]>([]);
  const [includeActionIds, setIncludeActionIds] = useState<number[]>([]);

  const [parsedActions, setParsedActions] = useState<EditableAction[]>([]);
  const [historyActions, setHistoryActions] = useState<EditableAction[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [fetchedProjects, fetchedUsers] = await Promise.all([
          usersApi.listProjects(),
          usersApi.listUsers(),
        ]);
        setProjects(fetchedProjects);
        setUsers(fetchedUsers);
      } catch (e) {
        console.error('加载基础数据失败:', e);
      }
    };
    fetchBaseData();
  }, []);

  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) {
        setLoading(false);
        return;
      }
      try {
        const meeting = await meetingsApi.get(meetingId);
        setTitle(meeting.title);
        setProjectId(meeting.projectId);
        setMeetingDate(meeting.meetingDate);
        setParticipantIds(meeting.participantIds);
        setDiscussionPoints(meeting.discussionPoints);
        setDecisions(meeting.decisions);

        if (meeting.actionItems) {
          const parsed: EditableAction[] = meeting.actionItems
            .filter((a) => !a.fromHistory)
            .map((a) => ({
              ...a,
              tempKey: `existing_${a.id}`,
              isParsed: true,
            }));
          setParsedActions(parsed);

          const history: EditableAction[] = meeting.actionItems
            .filter((a) => a.fromHistory)
            .map((a) => ({
              ...a,
              tempKey: `history_${a.id}`,
              fromHistory: true,
            }));
          setHistoryActions(history);
          setIncludeActionIds(
            meeting.actionItems.filter((a) => a.fromHistory).map((a) => a.id)
          );
        }

        const siblings = await meetingsApi.getUnfinishedSiblings(meetingId);
        setUnfinishedSiblings(siblings);
      } catch (e) {
        console.error('加载会议数据失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetingData();
  }, [meetingId]);

  useEffect(() => {
    const fetchSiblingsForNew = async () => {
      if (!projectId || !isNew) return;
      try {
        const siblings = await meetingsApi.getUnfinishedByProject(Number(projectId));
        setUnfinishedSiblings(siblings);
      } catch (e) {
        console.error('加载未完成项失败:', e);
      }
    };
    fetchSiblingsForNew();
  }, [projectId, isNew]);

  useEffect(() => {
    const combinedText = `${discussionPoints}\n${decisions}`;
    const parsed = parseActions(combinedText);
    const userMap = new Map(users.map((u) => [u.name, u]));

    const newParsedActions: EditableAction[] = parsed.map((p) => {
      const matchedUser = userMap.get(p.assigneeName);
      const existing = parsedActions.find((e) => e.tempKey === p.tempKey);
      if (existing) {
        return {
          ...existing,
          title: p.title,
          assigneeName: p.assigneeName || existing.assigneeName,
          assigneeId: matchedUser?.id || existing.assigneeId,
          dueDate: p.dueDate || existing.dueDate,
          status: (p.status as ActionStatus) || existing.status,
          description: p.description || existing.description,
          isParsed: true,
        } as EditableAction;
      }
      return {
        ...p,
        assigneeId: matchedUser?.id,
        isParsed: true,
      } as EditableAction;
    });
    setParsedActions(newParsedActions);
  }, [discussionPoints, decisions, users]);

  const toggleParticipant = (userId: number) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleIncludeAction = (actionId: number) => {
    setIncludeActionIds((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId]
    );
  };

  const handleUpdateParsedAction = useCallback(
    (action: EditableAction) => {
      setParsedActions((prev) =>
        prev.map((a) => (a.tempKey === action.tempKey ? action : a))
      );
    },
    []
  );

  const handleUpdateHistoryAction = useCallback(
    (action: EditableAction) => {
      setHistoryActions((prev) =>
        prev.map((a) => (a.tempKey === action.tempKey ? action : a))
      );
    },
    []
  );

  const handleDeleteHistoryAction = useCallback((tempKey: string) => {
    setHistoryActions((prev) => prev.filter((a) => a.tempKey !== tempKey));
    const idStr = tempKey.replace('history_', '').replace('existing_', '');
    const idNum = parseInt(idStr, 10);
    if (!isNaN(idNum)) {
      setIncludeActionIds((prev) => prev.filter((i) => i !== idNum));
    }
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入会议主题';
    if (!projectId) newErrors.projectId = '请选择项目';
    if (!meetingDate) newErrors.meetingDate = '请选择会议日期';
    if (participantIds.length === 0) newErrors.participants = '请至少选择一位参会人';

    parsedActions.forEach((action, idx) => {
      if (!action.assigneeId) {
        newErrors[`action_${action.tempKey}`] = `第 ${idx + 1} 个行动项未分配责任人`;
      }
      if (!action.title.trim()) {
        newErrors[`action_title_${action.tempKey}`] = `第 ${idx + 1} 个行动项标题不能为空`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildActionOverrides = (): ActionOverride[] => {
    const overrides: ActionOverride[] = [];

    for (const action of parsedActions) {
      if (action.assigneeId && action.title.trim()) {
        const override: ActionOverride = {
          tempKey: action.tempKey,
          title: action.title.trim(),
          assigneeId: action.assigneeId,
          dueDate: action.dueDate,
          status: (action.status as ActionStatus) || 'todo',
          description: action.description,
        };
        if ('id' in action && typeof action.id === 'number') {
          override.id = action.id;
        }
        overrides.push(override);
      }
    }

    for (const action of historyActions) {
      if (action.assigneeId && action.title.trim()) {
        const override: ActionOverride = {
          tempKey: action.tempKey,
          title: action.title.trim(),
          assigneeId: action.assigneeId,
          dueDate: action.dueDate,
          status: (action.status as ActionStatus) || 'todo',
          description: action.description,
        };
        if ('id' in action && typeof action.id === 'number') {
          override.id = action.id;
        }
        overrides.push(override);
      }
    }

    return overrides;
  };

  const buildPayload = (): CreateMeetingRequest | UpdateMeetingRequest => {
    const base = {
      title: title.trim(),
      projectId: Number(projectId),
      meetingDate,
      participantIds,
      discussionPoints,
      decisions,
      includeActionIds: includeActionIds.length > 0 ? includeActionIds : undefined,
      actionOverrides: buildActionOverrides(),
    };

    if (isNew) {
      return {
        ...base,
        createdBy: currentUser.id,
      } as CreateMeetingRequest;
    }
    return base as UpdateMeetingRequest;
  };

  const handleSave = async (sendEmailAfter: boolean = false) => {
    if (!validate()) return;

    setSaving(true);
    try {
      let savedMeeting: Meeting;
      const payload = buildPayload();

      if (isNew) {
        savedMeeting = await meetingsApi.create(payload as CreateMeetingRequest);
      } else {
        savedMeeting = await meetingsApi.update(meetingId!, payload as UpdateMeetingRequest);
      }

      if (sendEmailAfter) {
        setSendingEmail(true);
        try {
          await meetingsApi.sendEmail(savedMeeting.id, { ccCreator: true });
        } catch (e) {
          console.error('发送邮件失败:', e);
        } finally {
          setSendingEmail(false);
        }
      }

      navigate(`/meetings/${savedMeeting.id}`);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : '保存失败';
      setErrors({ save: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const totalActionCount = parsedActions.length + historyActions.length;
  const showHistorySection = !isNew || (projectId && unfinishedSiblings.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            {isNew ? '新建会议纪要' : '编辑会议纪要'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            填写会议内容，系统将自动识别 @提及 和 #Action 行动项
          </p>
        </div>
      </div>

      {errors.save && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <span className="text-rose-700 text-sm">{errors.save}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
        <div className="md:col-span-7 space-y-6">
          <div className="card-base p-6 space-y-5">
            <Input
              label=""
              placeholder="会议主题，例如：Alpha 产品评审会"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="!text-xl !py-4 !font-semibold !text-navy-800 placeholder:!text-slate-400 placeholder:!font-normal"
              error={errors.title}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="项目"
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="选择项目"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
                error={errors.projectId}
              />
              <DatePicker
                label="会议日期"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                error={errors.meetingDate}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  创建人
                </label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-slate-800">{currentUser.name}</div>
                    <div className="text-xs text-slate-500">{currentUser.email}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-base p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserRound className="w-4 h-4 text-navy-600" />
                <h3 className="text-sm font-semibold text-slate-800">参会人员</h3>
              </div>
              <span className="text-xs text-slate-500">
                已选择 {participantIds.length} / {users.length} 人
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {users.map((user) => {
                const selected = participantIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleParticipant(user.id)}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-left',
                      selected
                        ? 'border-amber-400 bg-amber-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <Avatar name={user.name} color={user.avatarColor} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-sm font-medium truncate',
                          selected ? 'text-amber-800' : 'text-slate-800'
                        )}
                      >
                        {user.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{user.role === 'admin' ? '管理员' : '成员'}</div>
                    </div>
                    {selected && (
                      <CheckSquare className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            {errors.participants && (
              <p className="mt-2 text-sm text-rose-600">{errors.participants}</p>
            )}
          </div>

          <div className="card-base p-6 space-y-5">
            <MentionEditor
              label="讨论要点"
              placeholder="记录会议讨论内容，使用 @提及 分配人员，使用 #Action 标记行动项..."
              value={discussionPoints}
              onChange={setDiscussionPoints}
              users={users}
              rows={8}
            />

            <MentionEditor
              label="决策结论"
              placeholder="记录会议决策事项和明确的行动项..."
              value={decisions}
              onChange={setDecisions}
              users={users}
              rows={6}
            />
          </div>

          {showHistorySection && (
            <div className="card-base p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  上次会议未完成项（可勾选纳入本次）
                </h3>
              </div>
              {unfinishedSiblings.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  暂无未完成的历史行动项
                </div>
              ) : (
                <div className="space-y-2">
                  {unfinishedSiblings.map((action) => {
                    const included = includeActionIds.includes(action.id);
                    const user = users.find((u) => u.id === action.assigneeId);
                    const isOverdue = action.overdue;
                    return (
                      <label
                        key={action.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all',
                          included
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleIncludeAction(action.id)}
                          className="mt-1 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-800">
                              {action.title}
                            </span>
                            {isOverdue && (
                              <Tag variant="rose">
                                <Clock className="w-3 h-3 mr-0.5" />
                                逾期
                              </Tag>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              {user ? (
                                <>
                                  <Avatar name={user.name} color={user.avatarColor} size="sm" className="!w-5 !h-5 !text-[10px]" />
                                  {user.name}
                                </>
                              ) : (
                                '未分配'
                              )}
                            </span>
                            {action.dueDate && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {action.dueDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="card-base p-5 flex items-center justify-between gap-3 flex-wrap">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              取消
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                loading={saving}
                onClick={() => handleSave(false)}
                leftIcon={<Save className="w-4 h-4" />}
              >
                保存草稿
              </Button>
              <Button
                variant="primary"
                loading={saving || sendingEmail}
                onClick={() => handleSave(true)}
                leftIcon={<Mail className="w-4 h-4" />}
              >
                保存并发送邮件
              </Button>
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="sticky top-24 space-y-4">
            <div className="card-base p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-800">
                      自动生成的行动项
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    共 {totalActionCount} 项 · 从 @提及 和 #Action 实时解析
                  </p>
                </div>
                <Tag variant="amber" className="!px-2.5">
                  {totalActionCount}
                </Tag>
              </div>

              <div className="space-y-3">
                {parsedActions.length === 0 && historyActions.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">暂无自动识别的行动项</p>
                    <p className="text-xs text-slate-400 mt-1">
                      在左侧输入 @提及 或 #Action 标签
                    </p>
                  </div>
                ) : (
                  <>
                    {parsedActions.length > 0 && (
                      <div className="space-y-3">
                        {parsedActions.map((action) => (
                          <EditableActionCard
                            key={action.tempKey}
                            action={action}
                            users={users}
                            onUpdate={handleUpdateParsedAction}
                            canDelete={false}
                          />
                        ))}
                      </div>
                    )}

                    {historyActions.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <History className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-xs font-medium text-indigo-700">
                            来自上次会议：
                          </span>
                          <Tag variant="indigo">{historyActions.length} 项</Tag>
                        </div>
                        <div className="space-y-3">
                          {historyActions.map((action) => (
                            <EditableActionCard
                              key={action.tempKey}
                              action={action}
                              users={users}
                              onUpdate={handleUpdateHistoryAction}
                              onDelete={() => handleDeleteHistoryAction(action.tempKey)}
                              canDelete={true}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {totalActionCount > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    可在下方编辑每个行动项的责任人与截止日期，未分配责任人的行动项将无法保存
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingEdit;
