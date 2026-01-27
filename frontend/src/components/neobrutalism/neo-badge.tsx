import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface NeoBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

const NeoBadge = forwardRef<HTMLSpanElement, NeoBadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white',
      success: 'bg-[rgb(57,255,20)]',
      warning: 'bg-[rgb(255,255,0)]',
      danger: 'bg-[rgb(239,68,68)]',
      info: 'bg-[rgb(0,191,255)]',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'border-2 border-black px-3 py-1 font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

NeoBadge.displayName = 'NeoBadge';

export { NeoBadge };