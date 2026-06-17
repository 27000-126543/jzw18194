import React from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date';
import type { SearchMeetingHit } from '../../../shared/types';
import Avatar from '@/components/common/Avatar';
import HighlightText from './HighlightText';
import Tag from '@/components/common/Tag';

interface SearchMeetingCardProps {
  hit: SearchMeetingHit;
  highlightEnabled?: boolean;
}

const SearchMeetingCard: React.FC<SearchMeetingCardProps> = ({ hit, highlightEnabled = true }) => {
  const bestSnippet = hit.highlights[0];

  return (
    <article className="card-base p-5 hover:border-navy-200 transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center text-navy-600">
          <FileText className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <a
            href={`/meetings/${hit.id}`}
            className="block group-hover:opacity-90"
          >
            <h3 className="text-lg font-semibold text-navy-700 underline decoration-navy-300 decoration-1 underline-offset-2 hover:decoration-navy-500 mb-2 transition-colors">
              <HighlightText text={hit.title} enabled={highlightEnabled} />
            </h3>
          </a>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
            <Tag variant="project" color={hit.projectColor} className="!text-[11px]">
              {hit.projectName}
            </Tag>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span>{formatDate(hit.meetingDate, 'MM月DD日')}</span>
          </div>

          {bestSnippet && (
            <p className="text-sm text-slate-600 leading-relaxed mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
              <HighlightText text={bestSnippet.snippet} enabled={highlightEnabled} />
            </p>
          )}

          {hit.matchedParticipants && hit.matchedParticipants.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">参会人：</span>
              <div className="flex -space-x-2">
                {hit.matchedParticipants.slice(0, 5).map((user) => (
                  <div key={user.id} title={user.name}>
                    <Avatar
                      name={user.name}
                      size="sm"
                      color={user.avatarColor}
                      className="!w-7 !h-7 !text-[11px] ring-2 ring-white"
                    />
                  </div>
                ))}
                {hit.matchedParticipants.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                    +{hit.matchedParticipants.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default SearchMeetingCard;
