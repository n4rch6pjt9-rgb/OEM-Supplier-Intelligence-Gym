import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#C2410C] text-white shadow-sm hover:bg-[#ea580c] font-semibold border border-[#F28C5B]/40 transition-colors',
        primary:
          'bg-[#C2410C] text-white shadow-sm hover:bg-[#ea580c] font-semibold border border-[#F28C5B]/40 transition-colors',
        lovable:
          'bg-gradient-to-r from-[#C2410C] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-semibold shadow-md shadow-[#C2410C]/20 border border-[#F28C5B]/40',
        destructive:
          'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30 hover:bg-red-500/20 shadow-xs',
        outline:
          'border border-[var(--border-app)] bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs transition-colors',
        secondary:
          'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-app)] shadow-xs hover:bg-[var(--bg-surface-subtle)] transition-colors',
        ghost:
          'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors',
        link:
          'text-[#C2410C] dark:text-[#F28C5B] underline-offset-4 hover:underline',
        emerald:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 shadow-xs',
        amber:
          'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 shadow-xs',
        cyan:
          'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 shadow-xs',
      },
      size: {
        default: 'h-8 px-3.5 py-1.5',
        sm: 'h-7 rounded-md px-2.5 text-[11px]',
        lg: 'h-10 rounded-xl px-5 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
