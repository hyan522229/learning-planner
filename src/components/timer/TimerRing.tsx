import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
}

export function TimerRing({ progress, size = 280, strokeWidth = 12 }: Props) {
  const circleRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    gsap.to(circle, {
      strokeDashoffset: offset,
      duration: 0.5,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    // Color transition
    let color = '#3b82f6';
    if (progress <= 0.1) color = '#ef4444';
    else if (progress <= 0.3) color = '#f59e0b';

    gsap.to(circle, {
      stroke: color,
      duration: 0.5,
      overwrite: 'auto',
    });

    // Glow pulse when running low
    if (progress <= 0.15 && progress > 0) {
      gsap.to(circle, {
        filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))',
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    } else {
      gsap.to(circle, { filter: 'drop-shadow(0 0 0px transparent)', duration: 0.3, overwrite: 'auto' });
    }
  }, [progress, offset]);

  return (
    <div className="relative inline-flex">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* Glow layer */}
        <circle
          ref={glowRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          stroke="#3b82f6"
          opacity={0.15}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference,
          }}
        />
        {/* Progress ring */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke="#3b82f6"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference,
          }}
        />
      </svg>
    </div>
  );
}
