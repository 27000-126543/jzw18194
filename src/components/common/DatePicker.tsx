import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, className, wrapperClassName, id, ...props }, ref) => {
    const inputId = id || `datepicker-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Calendar className="w-4 h-4" />
          </div>
          <input
            id={inputId}
            ref={ref}
            type="date"
            className={cn(
              'input-base pl-10',
              error && 'border-rose-400 focus:ring-rose-400/50 focus:border-rose-400',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-rose-600">{error}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
