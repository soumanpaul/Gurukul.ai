import { AppState } from 'react-native';
import type { Foundation } from '../../services/foundation';
import { QuizManager } from '../../services/quiz-manager';
import { loadGroundedRuntime } from './study';
import { quizSchema } from '../../domain/quiz';
import { getReader } from '../../t0/native';
import manifest from '../../t0/model.json';
let manager:QuizManager|undefined;
export function getQuizManager(foundation:Foundation){
  if(manager)return manager;
  manager=new QuizManager(foundation.quizzes,{
    id:()=>getReader().newId(),model:`${manifest.id}@${manifest.revision}:${manifest.sha256}/${manifest.runtime}`,
    sections:notebook=>foundation.study.sections(notebook),load:()=>loadGroundedRuntime(foundation,quizSchema),
  });
  const instance=manager;
  AppState.addEventListener('change',state=>{void instance.setForeground(state==='active').catch(()=>{});});
  void instance.setForeground(AppState.currentState==='active');return manager;
}
