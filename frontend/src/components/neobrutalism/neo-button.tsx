import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface NeoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'warning' | 'danger' | 'default';
}

const NeoButton = forwardRef<HTMLButtonElement, NeoButtonProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'bg-white border-3 border-black',
      primary: 'bg-[rgb(57,255,20)] border-3 border-black',
      secondary: 'bg-[rgb(0,191,255)] border-3 border-black',
      accent: 'bg-[rgb(255,105,180)] border-3 border-black',
      warning: 'bg-[rgb(255,255,0)] border-3 border-black',
      danger: 'bg-[rgb(239,68,68)] border-3 border-black',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'px-6 py-3 font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
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