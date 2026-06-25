/**
 * Global task-completion audio manager.
 * Survives component unmount so ringtone continues across page navigation.
 */

let currentCleanup: (() => void) | null = null;
let currentAlarmAudio: HTMLAudioElement | null = null;

export function getAudioPlaying() {
  return currentCleanup !== null || currentAlarmAudio !== null;
}

export function stopAudio() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  if (currentAlarmAudio) {
    currentAlarmAudio.pause();
    currentAlarmAudio.currentTime = 0;
    currentAlarmAudio = null;
  }
}

export function playCompletionAudio(
  playUploaded: (category: 'task_complete', loop: boolean) => (() => void) | null,
  playBeep: () => void,
) {
  stopAudio();
  const cleanup = playUploaded('task_complete', false);
  if (cleanup) {
    currentCleanup = () => { cleanup(); currentCleanup = null; };
  } else {
    playBeep();
    // Beep is one-shot, no persistent cleanup needed
  }
}

export function playAlarmAudio(fallbackAudio: string) {
  stopAudio();
  const audio = new Audio(fallbackAudio);
  audio.loop = true;
  audio.volume = 0.7;
  currentAlarmAudio = audio;
  audio.play().catch(() => {});
}
