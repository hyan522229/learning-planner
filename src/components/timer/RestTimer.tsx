import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui';
import { StartButton } from '@/components/ui/StartButton';
import { Card, CardContent } from '@/components/ui';
import { useRestTimer } from '@/hooks/useRestTimer';
import { useAudioFiles } from '@/hooks/useAudioFiles';
import { usePersonaStore } from '@/stores/personaStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Coffee, Play, Square, BellOff, Clock } from 'lucide-react';

const DURATION_OPTIONS = [5, 10, 15] as const;
const ALARM_AUDIO = '/alarm.mp3';

export function RestTimer() {
  const { phase, durationMinutes, remainingSeconds, start, endEarly, dismissAlarm } = useRestTimer();
  const [pickMinutes, setPickMinutes] = useState<number>(10);
  const activePersonaId = usePersonaStore(s => s.activePersonaId);
  const restAlarmEnabled = useSettingsStore(s => s.settings?.restAlarmEnabled ?? true);
  const { playRandom } = useAudioFiles(activePersonaId ?? undefined);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const audioUnlocked = useRef(false);

  // Unlock audio on first user interaction (required by mobile browsers)
  useEffect(() => {
    if (audioUnlocked.current) return;
    const unlock = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.resume();
        // Create silent buffer to fully unlock
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        audioUnlocked.current = true;
      } catch { /* ignore */ }
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // Handle alarm audio when phase changes to 'alarm'
  useEffect(() => {
    if (phase !== 'alarm') {
      // Clean up previous alarm audio
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current = null;
      }
      return;
    }

    // Play alarm only if enabled
    if (!restAlarmEnabled) return;

    // Vibrate on mobile if available
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    // Try user-uploaded audio first (loop for alarm)
    const cleanup = playRandom('rest_alarm', true);
    if (cleanup) {
      cleanupRef.current = cleanup;
    } else {
      // Fall back to default alarm.mp3
      const audio = new Audio(ALARM_AUDIO);
      audio.loop = true;
      audio.volume = 0.7;
      alarmAudioRef.current = audio;
      // Retry play on mobile (autoplay may be blocked)
      audio.play().catch(() => {
        // Retry after 500ms — sometimes the audio context needs time
        setTimeout(() => audio.play().catch(() => {}), 500);
      });
    }

    return () => {
      if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current.currentTime = 0;
        alarmAudioRef.current = null;
      }
    };
  }, [phase, playRandom, restAlarmEnabled]);

  const handleDismiss = () => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
      alarmAudioRef.current = null;
    }
    dismissAlarm();
  };

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <Coffee size={16} className="text-amber-500" />
          休息计时器
        </h3>

        {/* ── Idle: pick duration + start ── */}
        {phase === 'idle' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setPickMinutes(d)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    pickMinutes === d
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300'
                      : 'border-input bg-transparent text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {d} 分钟
                </button>
              ))}
            </div>
            <StartButton onClick={() => start(pickMinutes)} size="default" variant="outline">
              开始休息
            </StartButton>
          </div>
        )}

        {/* ── Running: countdown + end early ── */}
        {phase === 'running' && (
          <div className="space-y-3">
            <div className="text-center">
              <motion.div
                key="running"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-4xl font-bold tabular-nums tracking-wide text-amber-600 dark:text-amber-400"
              >
                {timeStr}
              </motion.div>
              <p className="text-xs text-muted-foreground mt-1">休息中...</p>
            </div>
            <Button onClick={endEarly} className="w-full gap-2" variant="outline">
              <Square size={16} />
              提前结束休息
            </Button>
          </div>
        )}

        {/* ── Alarm: ringing ── */}
        <AnimatePresence>
          {phase === 'alarm' && (
            <motion.div
              key="alarm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="text-center py-3">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                  className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400"
                >
                  <BellOff size={28} />
                  <span className="text-2xl font-bold">休息结束！</span>
                </motion.div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock size={12} className="inline mr-1" />
                  已休息 {durationMinutes} 分钟
                </p>
              </div>
              <Button onClick={handleDismiss} className="w-full gap-2" variant="default">
                <BellOff size={16} />
                关闭闹铃
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
