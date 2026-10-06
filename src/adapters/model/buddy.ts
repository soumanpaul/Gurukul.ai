import { AppState } from 'react-native';
import type { Foundation } from '../../services/foundation';
import { BuddyManager } from '../../services/buddy-manager';
import { loadGroundedRuntime } from './study';
import { buddySchema } from '../../domain/buddy';
import { getReader } from '../../t0/native';
import manifest from '../../t0/model.json';

let manager: BuddyManager | undefined;
export function getBuddyManager(foundation: Foundation) {
  if (manager) return manager;
  manager = new BuddyManager(foundation.buddy, {
    id: () => getReader().newId(), model: `${manifest.id}@${manifest.revision}:${manifest.sha256}/llama.rn-0.9.1`,
    load: () => loadGroundedRuntime(foundation, buddySchema),
  });
  const instance = manager;
  AppState.addEventListener('change', state => { void instance.setForeground(state === 'active').catch(() => {}); });
  void instance.setForeground(AppState.currentState === 'active');
  return manager;
}
