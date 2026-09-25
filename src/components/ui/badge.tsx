import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-[var(--border-app)] bg-[var(--bg-surface)] text-[var(--text-primary)]',
        secondary:
          'border-[var(--border-app)] bg-[var(--bg-card)] text-[var(--text-secondary)]',
        destructive:
          'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
        outline:
          'text-[var(--text-secondary)] border-[var(--border-app)] bg-transparent',
        brand:
          'bg-[#C2410C]/10 text-[#C2410C] dark:text-[#F28C5B] border-[#C2410C]/30 font-semibold',
        cyan:
          'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
        emerald:
          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        amber:
          'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30 font-medium',
        purple:
          'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
        glow:
          'bg-gradient-to-r from-[#C2410C]/15 to-[#F28C5B]/15 text-[#C2410C] dark:text-[#F28C5B] border border-[#F28C5B]/40 shadow-xs shadow-[#C2410C]/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
