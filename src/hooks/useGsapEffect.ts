import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export { gsap, useGSAP };

/** Safe selector within a container ref */
export function useGsapContext() {
  const ctxRef = useRef<gsap.Context | null>(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = gsap.context(() => {});
    }
    return ctxRef.current;
  };

  const cleanup = () => {
    if (ctxRef.current) {
      ctxRef.current.revert();
      ctxRef.current = null;
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return { ctx: getCtx(), cleanup };
}
