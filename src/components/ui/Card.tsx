import { cn } from '@/utils/cn';
import { type HTMLAttributes, forwardRef, useRef, useCallback } from 'react';
import gsap from 'gsap';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(e);
      gsap.to(localRef.current, {
        y: -2,
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        duration: 0.3,
        ease: 'power2.out',
        force3D: false,
      });
    }, [onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(e);
      gsap.to(localRef.current, {
        y: 0,
        boxShadow: '0 0 0 rgba(0,0,0,0)',
        duration: 0.35,
        ease: 'power2.out',
        force3D: false,
      });
    }, [onMouseLeave]);

    return (
      <div
        ref={(node) => {
          (localRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'rounded-lg border border-border/60 bg-card text-card-foreground',
          'transition-colors duration-200',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-tight tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
