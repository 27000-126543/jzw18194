import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  Calendar,
  Users,
  MessageSquare,
  CheckCircle2,
  ListTodo,
  Mail,
  Download,
  ArrowLeft,
  Pencil,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meeting, ActionItem, ActionStatus } from '@/types';
import { meetingsApi } from '@/services/meetingsApi';
import { actionsApi } from '@/services/actionsApi';
import Button from '@/components/common/Button';
import Tag from '@/components/common/Tag';
import Avatar from '@/components/common/Avatar';
import ActionRow from '@/components/action/ActionRow';
import ProgressBar from '@/components/meeting/ProgressBar';
import { formatDate } from '@/utils/date';
import { parseActions, renderParsedToHTML } from '@/utils/mentionParser';

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  rightAction?: React.ReactNode;
}> = ({ title, icon, children, className, rightAction }) => {
  return (
    <div className={cn('card-base p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <h3 className="text-base font-semibold text-navy-800">{title}</h3>
        </div>
        {rightAction}
      </div>
      {children}
    </div>
  );
};

const DetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-2 h-5">
        <div className="w-16 h-4 bg-slate-100 rounded" />
        <div className="w-4 h-4 bg-slate-100 rounded" />
        <div className="w-32 h-4 bg-slate-100 rounded" />
      </div>

      <div className="card-base p-6 space-y-4">
        <div className="h-8 w-3/4 bg-slate-100 rounded" />
        <div className="flex gap-3">
          <div className="h-6 w-20 bg-slate-100 rounded-full" />
          <div className="h-6 w-24 bg-slate-100 rounded-full" />
        </div>
      </div>

      <div className="card-base p-5">
        <div className="h-5 w-20 bg-slate-100 rounded mb-4" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-12 h-12 rounded-full bg-slate-100 ring-2 ring-white" />
          ))}
        </div>
      </div>

      <SectionCard title="" icon={<div className="w-5 h-5" />}>
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="h-4 w-5/6 bg-slate-100 rounded" />
          <div className="h-4 w-4/6 bg-slate-100 rounded" />
        </div>
      </SectionCard>

      <SectionCard title="" icon={<div className="w-5 h-5" />}>
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="h-4 w-3/4 bg-slate-100 rounded" />
        </div>
      </SectionCard>

      <SectionCard title="" icon={<div className="w-5 h-5" />}>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </SectionCard>
    </div>
  );
};

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  const meetingId = useMemo(() => parseInt(id || '0', 10), [id]);

  useEffect(() => {
    if (!meetingId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [meetingRes] = await Promise.all([
          meetingsApi.get(meetingId),
        ]);
        setMeeting(meetingRes);
        setActionItems(meetingRes.actionItems || []);
      } catch (error) {
        console.error('Failed to load meeting:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [meetingId]);

  const handleStatusChange = async (actionId: number, status: ActionStatus) => {
    try {
      const updated = await actionsApi.updateStatus(actionId, status);
      setActionItems((prev) =>
        prev.map((a) => (a.id === actionId ? updated : a))
      );
    } catch (error) {
      console.error('Failed to update action status:', error);
    }
  };

  const handleSendEmail = async () => {
    if (!meeting) return;
    setSendingEmail(true);
    try {
      await meetingsApi.sendEmail(meeting.id);
      alert('邮件已成功发送给参会人！');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('邮件发送失败，请重试');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleExport = () => {
    if (!meeting) return;
    const data = {
      meeting: {
        title: meeting.title,
        project: meeting.project?.name,
        meetingDate: meeting.meetingDate,
        creator: meeting.creator?.name,
        participants: meeting.participants?.map((p) => p.name),
        discussionPoints: meeting.discussionPoints,
        decisions: meeting.decisions,
      },
      actionItems: actionItems.map((a) => ({
        title: a.title,
        description: a.description,
        assignee: a.assignee?.name,
        status: a.status,
        dueDate: a.dueDate,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${meeting.id}-${formatDate(meeting.meetingDate)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRichText = (text: string) => {
    if (!text) return <p className="text-sm text-slate-400 italic">暂无内容</p>;
    const actions = parseActions(text);
    const html = renderParsedToHTML(text, actions);
    return (
      <div
        className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap [&_.parsed-action]:bg-amber-100 [&_.parsed-action]:text-amber-800 [&_.parsed-action]:px-1.5 [&_.parsed-action]:py-0.5 [&_.parsed-action]:rounded [&_.parsed-action]:font-medium"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const progress = useMemo(() => {
    const todo = actionItems.filter((a) => a.status === 'todo').length;
    const doing = actionItems.filter((a) => a.status === 'doing').length;
    const done = actionItems.filter((a) => a.status === 'done').length;
    return { todo, doing, done, total: actionItems.length };
  }, [actionItems]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!meeting) {
    return (
      <div className="card-base py-16 px-6 text-center">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-1">会议纪要不存在</h3>
        <p className="text-sm text-slate-500 mb-5">该会议纪要可能已被删除或不存在</p>
        <Button onClick={() => navigate('/meetings')}>返回总览</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-[1200px] mx-auto">
      <div className="flex items-center gap-2 text-sm">
        <Link
          to="/meetings"
          className="text-slate-500 hover:text-navy-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          总览
        </Link>
        <ChevronRight className="w-4 h-4 text-slate-300" />
        <span className="text-navy-800 font-medium truncate max-w-md">
          {meeting.title}
        </span>
      </div>

      <div className="card-base p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-navy-900 mb-3">
              {meeting.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              {meeting.project && (
                <Tag variant="project" color={meeting.project.color}>
                  {meeting.project.name}
                </Tag>
              )}
              <Tag variant="gray">
                <Calendar className="w-3 h-3" />
                {formatDate(meeting.meetingDate, 'MM月DD日')}
              </Tag>
              {meeting.creator && (
                <div className="flex items-center gap-1.5">
                  <Avatar
                    name={meeting.creator.name}
                    size="sm"
                    color={meeting.creator.avatarColor}
                    className="ring-0 !w-6 !h-6 text-[10px]"
                  />
                  <span className="text-xs text-slate-500">
                    {meeting.creator.name} 创建
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            leftIcon={<Pencil className="w-4 h-4" />}
            onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
          >
            编辑纪要
          </Button>
        </div>

        {actionItems.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="max-w-md">
              <ProgressBar
                todo={progress.todo}
                doing={progress.doing}
                done={progress.done}
                total={progress.total}
              />
            </div>
          </div>
        )}
      </div>

      <SectionCard
        title="参会人"
        icon={<Users className="w-4 h-4" />}
      >
        {meeting.participants && meeting.participants.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {meeting.participants.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1.5 group">
                <div className="relative">
                  <Avatar
                    name={p.name}
                    size="lg"
                    color={p.avatarColor}
                    className="ring-0 hover:ring-2 hover:ring-amber-300 transition-all"
                  />
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div className="bg-navy-800 text-white text-xs px-2 py-1 rounded shadow-lg">
                      {p.name}
                    </div>
                    <div className="w-2 h-2 bg-navy-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                </div>
                <span className="text-xs text-slate-600 font-medium max-w-[80px] truncate">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">暂无参会人</p>
        )}
      </SectionCard>

      <SectionCard
        title="讨论要点"
        icon={<MessageSquare className="w-4 h-4" />}
      >
        {renderRichText(meeting.discussionPoints)}
      </SectionCard>

      <SectionCard
        title="决策结论"
        icon={<CheckCircle2 className="w-4 h-4" />}
      >
        {renderRichText(meeting.decisions)}
      </SectionCard>

      <SectionCard
        title="行动项"
        icon={<ListTodo className="w-4 h-4" />}
        rightAction={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Mail className="w-4 h-4" />}
              onClick={handleSendEmail}
              loading={sendingEmail}
              className="!text-navy-600 hover:!bg-navy-50"
            >
              发送邮件
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
              className="!text-navy-600 hover:!bg-navy-50"
            >
              全部导出
            </Button>
          </div>
        }
      >
        {actionItems.length > 0 ? (
          <div className="space-y-3">
            {actionItems.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              该会议暂无行动项，您可以在编辑中添加
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default MeetingDetail;
