import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/utils/cn';
import { type ComponentProps, forwardRef } from 'react';

const Label = forwardRef<HTMLLabelElement, ComponentProps<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';

export { Label };
