import { cn } from '@/lib/utils';

export function GlassCard({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'glass rounded-xl p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
} 