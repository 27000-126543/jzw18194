import React from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: AvatarSize;
  color?: string;
  className?: string;
  title?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

function getFirstLetter(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}

const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  color = '#1e3a5f',
  className,
  title,
  style,
  ...rest
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'avatar'}
        title={title}
        className={cn(
          'rounded-full object-cover ring-2 ring-white',
          sizeClasses[size],
          className
        )}
        style={style}
        {...rest}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color, ...style }}
      title={title}
      {...rest}
    >
      {getFirstLetter(name || '')}
    </div>
  );
};

export default Avatar;
