/**
 * Thin wrapper around useRestTimerStore for backwards compatibility.
 * The rest timer is now a global Zustand store that survives page navigation.
 */
import { useRestTimerStore } from '@/stores/restTimerStore';

export function useRestTimer() {
  return useRestTimerStore();
}
