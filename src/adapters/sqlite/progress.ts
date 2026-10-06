import type { Database } from '../../db/types.ts';
import { deriveProgress } from '../../domain/progress.ts';
import type { ProgressRow } from '../../domain/progress.ts';
import { validateQuiz } from '../../domain/quiz.ts';
import type { QuizItem } from '../../domain/quiz.ts';
import type { QuizRow,ItemRow,Attempt } from './quizzes.ts';

export function createProgressRepository(database:Database){
  return {
    async read(){
      const rows=await database.getAllAsync<ProgressRow>(`SELECT a.id AS attempt_id,a.quiz_id,q.notebook_id,n.title AS notebook_title,
        a.status,a.started_at,a.submitted_at,a.correct_count,a.scorable_count,a.score,
        i.id AS item_id,i.item_json,q.evidence_json,r.selected_index,r.excluded,r.scorable,r.is_correct,
        COALESCE(f.flagged,0) AS flagged,repeat.parent_quiz_id
        FROM attempts a JOIN quizzes q ON q.id=a.quiz_id JOIN notebooks n ON n.id=q.notebook_id
        LEFT JOIN quiz_items i ON i.quiz_id=q.id LEFT JOIN responses r ON r.attempt_id=a.id AND r.item_id=i.id
        LEFT JOIN progress_flags f ON f.attempt_id=a.id AND f.item_id=i.id LEFT JOIN quiz_repeats repeat ON repeat.quiz_id=q.id`);
      return deriveProgress(rows);
    },
    async flag(attemptId:string,itemId:string,flagged:boolean){
      await database.withExclusiveTransactionAsync(async transaction=>{
        const row=await transaction.getFirstAsync<{id:string}>(`SELECT a.id FROM attempts a JOIN quiz_items i ON i.quiz_id=a.quiz_id
          WHERE a.id=? AND i.id=? AND a.status='submitted'`,attemptId,itemId);
        if(!row)throw new Error('Only completed attempt items can be flagged here');
        await transaction.runAsync(`INSERT INTO progress_flags VALUES (?,?,?,?) ON CONFLICT(attempt_id,item_id)
          DO UPDATE SET flagged=excluded.flagged,updated_at=excluded.updated_at`,attemptId,itemId,Number(flagged),new Date().toISOString());
      });
    },
    async repeat(parentId:string,quizId:string,attemptId:string){
      await database.withExclusiveTransactionAsync(async transaction=>{
        const existing=await transaction.getFirstAsync<{parent_quiz_id:string}>('SELECT parent_quiz_id FROM quiz_repeats WHERE quiz_id=?',quizId);
        if(existing){if(existing.parent_quiz_id!==parentId)throw new Error('Practice identity conflict');return;}
        const parent=await transaction.getFirstAsync<QuizRow>('SELECT * FROM quizzes WHERE id=?',parentId);
        const attempt=await transaction.getFirstAsync<Attempt>("SELECT * FROM attempts WHERE quiz_id=? AND status='submitted'",parentId);
        if(!parent||parent.status!=='ready'||!attempt)throw new Error('Choose a completed quiz to practise again');
        const items=await transaction.getAllAsync<ItemRow>('SELECT * FROM quiz_items WHERE quiz_id=? ORDER BY position',parentId);
        if(items.length!==parent.question_count||![3,5].includes(items.length))throw new Error('Incomplete saved quiz');
        const previous:QuizItem[]=[];
        for(const row of items)previous.push(validateQuiz(JSON.parse(row.item_json),JSON.parse(parent.evidence_json),previous));
        await transaction.runAsync(`INSERT INTO quizzes(id,notebook_id,question_count,status,evidence_json,model_version,prompt_version,created_at)
          SELECT ?,notebook_id,question_count,'ready',evidence_json,model_version,prompt_version,? FROM quizzes WHERE id=?`,quizId,new Date().toISOString(),parentId);
        await transaction.runAsync('INSERT INTO quiz_repeats VALUES (?,?)',quizId,parentId);
        await transaction.runAsync("INSERT INTO attempts(id,quiz_id,status,started_at) VALUES (?,?,'in_progress',?)",attemptId,quizId,new Date().toISOString());
        for(const [position,row] of items.entries()){
          const itemId=`${quizId}:${position}`;
          await transaction.runAsync('INSERT INTO quiz_items VALUES (?,?,?,?)',itemId,quizId,position,JSON.stringify(previous[position]));
          const flags=await transaction.getFirstAsync<{excluded:number;flagged:number}>(`SELECT r.excluded,COALESCE(f.flagged,0) AS flagged FROM responses r
            LEFT JOIN progress_flags f ON f.attempt_id=r.attempt_id AND f.item_id=r.item_id WHERE r.attempt_id=? AND r.item_id=?`,attempt.id,row.id);
          if(flags?.excluded||flags?.flagged)await transaction.runAsync('INSERT INTO responses(attempt_id,item_id,selected_index,excluded) VALUES (?,?,NULL,1)',attemptId,itemId);
        }
      });return quizId;
    },
  };
}
