import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const NeoCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-3 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

NeoCard.displayName = 'NeoCard';

export { NeoCard };