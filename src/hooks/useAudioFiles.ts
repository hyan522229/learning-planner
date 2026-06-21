import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { generateId } from '@/utils/id';
import type { AudioCategory, AudioFile } from '@/types';

/**
 * Manage user-uploaded audio files for timer alarms.
 * Files are stored as Blobs in IndexedDB.
 */
export function useAudioFiles(personaId: string | undefined) {
  const allFiles = useLiveQuery(
    async () => {
      if (!personaId) return [];
      return db.audioFiles.where({ personaId }).toArray();
    },
    [personaId],
  ) ?? [];

  const addFile = useCallback(async (category: AudioCategory, file: File) => {
    if (!personaId) return;
    const audioFile: AudioFile = {
      id: generateId(),
      personaId,
      category,
      name: file.name,
      data: new Blob([file], { type: file.type || 'audio/mpeg' }),
      createdAt: Date.now(),
    };
    await db.audioFiles.add(audioFile);
  }, [personaId]);

  const removeFile = useCallback(async (id: string) => {
    await db.audioFiles.delete(id);
  }, []);

  const getByCategory = useCallback((category: AudioCategory): AudioFile[] => {
    return allFiles.filter(f => f.category === category);
  }, [allFiles]);

  /** Pick a random file from the category and play it. Returns a cleanup function. */
  const playRandom = useCallback((category: AudioCategory, loop = false): (() => void) | null => {
    const files = allFiles.filter(f => f.category === category);
    if (files.length === 0) return null;

    const picked = files[Math.floor(Math.random() * files.length)];
    const url = URL.createObjectURL(picked.data);
    const audio = new Audio(url);
    audio.volume = 0.7;
    audio.loop = loop;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
      URL.revokeObjectURL(url);
    };
  }, [allFiles]);

  return { allFiles, addFile, removeFile, getByCategory, playRandom };
}
