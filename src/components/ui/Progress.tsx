import { cn } from '@/utils/cn';
import { forwardRef, useRef, useEffect } from 'react';
import gsap from 'gsap';

interface ProgressProps {
  value?: number;
  className?: string;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    const barRef = useRef<HTMLDivElement>(null);
    const prevValue = useRef(0);

    useEffect(() => {
      const bar = barRef.current;
      if (!bar) return;

      const target = Math.min(100, Math.max(0, value));
      gsap.to(bar, {
        width: `${target}%`,
        duration: 0.8,
        ease: 'power3.inOut',
        overwrite: 'auto',
      });

      // Pulse glow at 100%
      if (target >= 100 && prevValue.current < 100) {
        gsap.fromTo(bar,
          { boxShadow: '0 0 0px rgba(34,197,94,0)' },
          {
            boxShadow: '0 0 12px rgba(34,197,94,0.5)',
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
          }
        );
      }

      prevValue.current = target;
    }, [value]);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
          className
        )}
        {...props}
      >
        <div
          ref={barRef}
          className="h-full rounded-full relative overflow-hidden"
          style={{
            width: '0%',
            background: 'linear-gradient(90deg, #3b82f6, #2563eb, #3b82f6)',
            backgroundSize: '200% 100%',
            animation: 'progress-charge 3s linear infinite',
          }}
        >
          {/* Subtle shimmer overlay */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'progress-charge 2.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
