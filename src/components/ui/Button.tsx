import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/utils/cn';
import { type ButtonHTMLAttributes, forwardRef, useRef, useCallback } from 'react';
import gsap from 'gsap';

const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const sizes = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-8',
  icon: 'h-9 w-9',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, onClick, ...props }, ref) => {
    const localRef = useRef<HTMLButtonElement>(null);
    const rippleRef = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = useCallback(() => {
      const el = localRef.current;
      if (!el || props.disabled) return;
      gsap.to(el, {
        y: -2,
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        duration: 0.25,
        ease: 'power2.out',
        force3D: false,
      });
    }, [props.disabled]);

    const handleMouseLeave = useCallback(() => {
      const el = localRef.current;
      if (!el || props.disabled) return;
      gsap.to(el, {
        y: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        duration: 0.3,
        ease: 'power2.out',
        force3D: false,
      });
    }, [props.disabled]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      const btn = localRef.current;
      if (!btn || !rippleRef.current) {
        onClick?.(e);
        return;
      }

      // Ripple animation (only on the ripple pseudo-element, doesn't affect text)
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const ripple = rippleRef.current;
      gsap.set(ripple, {
        width: size,
        height: size,
        x: x - size / 2,
        y: y - size / 2,
        opacity: 0.3,
        scale: 0,
      });

      gsap.to(ripple, {
        scale: 1,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        force3D: false,
      });

      // Quick press feedback - no scale, just y + shadow
      gsap.to(btn, {
        y: 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        duration: 0.08,
        ease: 'power2.in',
        force3D: false,
        onComplete: () => {
          gsap.to(btn, {
            y: -2,
            boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
            duration: 0.3,
            ease: 'elastic.out(1, 0.5)',
            force3D: false,
          });
        },
      });

      onClick?.(e);
    }, [onClick]);

    const Comp = asChild ? Slot : 'button';

    if (asChild) {
      return (
        <Comp
          className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            variants[variant],
            sizes[size],
            className
          )}
          {...props}
        />
      );
    }

    return (
      <button
        ref={(node) => {
          (localRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium overflow-hidden',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          variants[variant],
          sizes[size],
          className
        )}
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          backfaceVisibility: 'hidden',
        }}
        {...props}
      >
        {/* Ripple */}
        <span
          ref={rippleRef}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{ width: 0, height: 0 }}
        />
        {props.children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, type ButtonProps };
