import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function NeonButton({ className, ...props }) {
  return (
    <Button
      className={cn(
        'bg-primary/80 text-primary-foreground hover:bg-primary/60 focus:ring-2 focus:ring-ring transition-colors',
        className
      )}
      {...props}
    />
  );
} 