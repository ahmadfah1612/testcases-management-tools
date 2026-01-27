import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface NeoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'danger' | 'default';
}

const NeoButton = forwardRef<HTMLButtonElement, NeoButtonProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white',
      primary: 'bg-[rgb(var(--neo-green))]',
      secondary: 'bg-[rgb(var(--neo-blue))]',
      accent: 'bg-[rgb(var(--neo-pink))]',
      warning: 'bg-[rgb(var(--neo-yellow))]',
      danger: 'bg-[rgb(var(--neo-red))]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'border-3 border-black px-6 py-3 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
          'hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
          'active:shadow-none active:translate-y-[4px] active:translate-x-[2px]',
          'transition-all disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

NeoButton.displayName = 'NeoButton';

export { NeoButton };