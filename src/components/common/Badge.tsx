import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  count?: number;
  showZero?: boolean;
  dot?: boolean;
  max?: number;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  count = 0,
  showZero = false,
  dot = false,
  max = 99,
  className,
}) => {
  if (!dot) {
    if (count <= 0 && !showZero) return null;
  }

  const displayCount = dot ? '' : count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1',
        'bg-rose-500 text-white text-[10px] font-bold',
        'rounded-full flex items-center justify-center',
        'ring-2 ring-white',
        dot && 'w-2 h-2 min-w-0 p-0 -top-0.5 -right-0.5',
        className
      )}
    >
      {displayCount}
    </span>
  );
};

export default Badge;
