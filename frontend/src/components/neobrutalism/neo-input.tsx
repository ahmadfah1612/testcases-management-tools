import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const NeoInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'border-2 border-black bg-white px-4 py-2',
          'focus:border-3 focus:outline-none focus:border-[rgb(147,197,253)]',
          'transition-all',
          className
        )}
        {...props}
      />
    );
  }
);

NeoInput.displayName = 'NeoInput';

export { NeoInput };