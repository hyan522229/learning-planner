/**
 * Module-level task-completion audio.
 * Audio survives component unmount — ringtone keeps playing across page navigation.
 * Only stops when stopAudio() is called explicitly (reset timer or stop button).
 */

let audio: HTMLAudioElement | null = null;

export function isAudioPlaying() {
  return audio !== null && !audio.paused;
}

export function stopAudio() {
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
    audio = null;
  }
}

/** Play a blob-based audio file (from IndexedDB). Auto-stops on 'ended'. */
export function playAudioFromBlob(blob: Blob, loop = false) {
  stopAudio();
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.volume = 0.7;
  a.loop = loop;
  a.onended = () => {
    URL.revokeObjectURL(url);
    if (!loop) audio = null;
  };
  a.play().catch(() => { URL.revokeObjectURL(url); });
  audio = a;
}

/** Play a file path. */
export function playAudioFromPath(path: string, loop = false) {
  stopAudio();
  const a = new Audio(path);
  a.volume = 0.7;
  a.loop = loop;
  a.onended = () => { if (!loop) audio = null; };
  a.play().catch(() => {});
  audio = a;
}
