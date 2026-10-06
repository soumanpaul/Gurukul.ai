import { File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import type { Foundation } from '../services/foundation';
import { withNativeSlot } from '../services/native-slot';
import { sourceUri } from './imports/native';
import { getStudyManager } from './model/study';
import { getQuizManager } from './model/quiz';
import { getBuddyManager } from './model/buddy';

export async function withIdleStudy<Result>(foundation: Foundation, work: () => Promise<Result>) {
  if (getStudyManager(foundation).snapshot().busy || getQuizManager(foundation).snapshot().busy || getBuddyManager(foundation).snapshot().busy) throw new Error('BUSY');
  return withNativeSlot(work);
}

export const availableStorage = () => Paths.availableDiskSpace;
export async function cleanupFiles(foundation: Foundation) {
  await foundation.storage.cleanup(async filename => {
      if (AppState.currentState !== 'active') throw new Error('INTERRUPTED');
      const file = new File(await sourceUri(filename));
      if (file.exists) await file.delete();
  });
}
export async function retryCleanup(foundation: Foundation) {
  await withNativeSlot(() => cleanupFiles(foundation));
}
