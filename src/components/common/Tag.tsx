import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type TagVariant = 'gray' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'violet' | 'project';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  color?: string;
  children: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;
  className?: string;
}

const variantClasses: Record<TagVariant, string> = {
  gray: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  violet: 'bg-violet-50 text-violet-700 border border-violet-200',
  project: '',
};

const Tag: React.FC<TagProps> = ({
  variant = 'gray',
  color,
  children,
  closable = false,
  onClose,
  className,
  onClick,
  style: extraStyle,
  ...rest
}) => {
  const projectStyle = variant === 'project' && color
    ? { backgroundColor: `${color}15`, color: color, borderColor: `${color}40` }
    : undefined;

  const style = { ...projectStyle, ...extraStyle } as React.CSSProperties;

  const projectClass = variant === 'project' ? 'border' : '';

  return (
    <span
      className={cn(
        'tag-base',
        variantClasses[variant],
        projectClass,
        className,
        onClick && 'cursor-pointer'
      )}
      style={style}
      onClick={onClick}
      {...rest}
    >
      {children}
      {closable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

export default Tag;
