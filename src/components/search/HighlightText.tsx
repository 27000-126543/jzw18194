import React from 'react';
import { cn } from '@/lib/utils';

interface HighlightTextProps {
  text: string;
  className?: string;
  enabled?: boolean;
}

const HIGHLIGHT_START = '[[HIGHLIGHT]]';
const HIGHLIGHT_END = '[[/HIGHLIGHT]]';

const HighlightText: React.FC<HighlightTextProps> = ({ text, className, enabled = true }) => {
  if (!enabled || !text.includes(HIGHLIGHT_START)) {
    return <span className={className}>{text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const startIdx = remaining.indexOf(HIGHLIGHT_START);
    if (startIdx === -1) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (startIdx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, startIdx)}</span>);
    }

    const afterStart = remaining.slice(startIdx + HIGHLIGHT_START.length);
    const endIdx = afterStart.indexOf(HIGHLIGHT_END);

    if (endIdx === -1) {
      parts.push(
        <mark key={key++} className="search-highlight">
          {afterStart}
        </mark>
      );
      break;
    }

    const highlighted = afterStart.slice(0, endIdx);
    parts.push(
      <mark key={key++} className={cn('search-highlight', className)}>
        {highlighted}
      </mark>
    );

    remaining = afterStart.slice(endIdx + HIGHLIGHT_END.length);
  }

  return <>{parts}</>;
};

export default HighlightText;
