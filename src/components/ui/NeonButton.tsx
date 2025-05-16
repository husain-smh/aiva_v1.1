import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';

type NeonButtonProps = ComponentProps<typeof Button>;

export function NeonButton({ className, ...props }: NeonButtonProps) {
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
