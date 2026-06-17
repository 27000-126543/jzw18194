import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Eye, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/types';
import Tag from '@/components/common/Tag';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import ProgressBar from './ProgressBar';
import { formatDate } from '@/utils/date';

interface MeetingCardProps {
  meeting: Meeting;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (meeting: Meeting) => void;
  className?: string;
}

const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onEdit,
  onDelete,
  className,
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/meetings/${meeting.id}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(meeting);
    } else {
      navigate(`/meetings/${meeting.id}/edit`);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/meetings/${meeting.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(meeting);
  };

  const participants = meeting.participants || [];
  const visibleParticipants = participants.slice(0, 4);
  const remainingCount = participants.length - visibleParticipants.length;

  const progress = meeting.progress || { todo: 0, doing: 0, done: 0, total: 0 };

  return (
    <div
      className={cn(
        'card-base p-5 cursor-pointer group',
        className
      )}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-navy-800 group-hover:text-amber-600 transition-colors truncate">
            {meeting.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {meeting.project && (
              <Tag variant="project" color={meeting.project.color}>
                {meeting.project.name}
              </Tag>
            )}
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {formatDate(meeting.meetingDate, 'MM月DD日')}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            {meeting.creator && (
              <>
                <Avatar
                  name={meeting.creator.name}
                  size="sm"
                  color={meeting.creator.avatarColor}
                />
                <span className="text-xs text-slate-500">
                  {meeting.creator.name}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex -space-x-2">
            {visibleParticipants.map((p, idx) => (
              <Avatar
                key={p.id}
                name={p.name}
                size="sm"
                color={p.avatarColor}
                className="ring-2 ring-white"
                style={{ zIndex: visibleParticipants.length - idx }}
              />
            ))}
            {remainingCount > 0 && (
              <div
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center ring-2 ring-white"
                style={{ zIndex: 0 }}
              >
                +{remainingCount}
              </div>
            )}
            {participants.length === 0 && (
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                <span className="text-xs text-slate-400">-</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-64 shrink-0">
          <ProgressBar
            todo={progress.todo}
            doing={progress.doing}
            done={progress.done}
            total={progress.total}
          />

          <div className="flex items-center justify-end gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Pencil className="w-4 h-4" />}
              onClick={handleEditClick}
              className="!px-2 !py-1.5"
            />
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={handleViewClick}
              className="!px-2 !py-1.5"
            />
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
              onClick={handleDeleteClick}
              className="!px-2 !py-1.5 hover:!bg-rose-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
