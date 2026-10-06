import type { Database, SqlExecutor } from '../../db/types.ts';
import type { Evidence } from '../../domain/study.ts';
import { gradeQuiz, validateQuiz } from '../../domain/quiz.ts';
import type { QuizItem } from '../../domain/quiz.ts';
export interface QuizRow { id: string; notebook_id: string; question_count: number; status: string; evidence_json: string; error: string | null; created_at: string }
export interface Attempt { id: string; quiz_id: string; status: string; correct_count: number | null; scorable_count: number | null; score: number | null; started_at: string; submitted_at: string | null }
export interface ItemRow { id: string; quiz_id: string; position: number; item_json: string }
export interface ResponseRow { item_id: string; selected_index: number | null; excluded: number; is_correct: number | null; scorable: number | null }
async function required<Result>(database: SqlExecutor, sql: string, id: string): Promise<Result> { const row=await database.getFirstAsync<Result>(sql,id); if(!row) throw new Error('Record not found'); return row; }
export function createQuizRepository(database: Database) {
  return {
    async recover() { await database.runAsync("UPDATE quizzes SET status='interrupted',error='Generation interrupted. Generate a new quiz.' WHERE status='generating'"); },
    async begin(input: {id:string;notebook:string;count:3|5;evidence:Evidence[];model:string;prompt:string}) {
      await database.runAsync("INSERT INTO quizzes(id,notebook_id,question_count,status,evidence_json,model_version,prompt_version,created_at) VALUES (?,?,?,'generating',?,?,?,?)",input.id,input.notebook,input.count,JSON.stringify(input.evidence),input.model,input.prompt,new Date().toISOString());
    },
    async fail(id:string,status:'failed'|'cancelled',error:string) { await database.runAsync("UPDATE quizzes SET status=?,error=? WHERE id=? AND status='generating'",status,error,id); },
    async publish(id:string,items:{id:string;item:QuizItem}[]) {
      await database.withExclusiveTransactionAsync(async transaction=>{
        const quiz=await required<QuizRow>(transaction,'SELECT * FROM quizzes WHERE id=?',id);
        if(quiz.status!=='generating'||items.length!==quiz.question_count) throw new Error('Incomplete quiz');
        const evidence:Evidence[]=JSON.parse(quiz.evidence_json);const previous:QuizItem[]=[];
        for(const [position,snapshot] of items.entries()) {
          const item=validateQuiz(snapshot.item,evidence,previous);previous.push(item);
          await transaction.runAsync('INSERT INTO quiz_items VALUES (?,?,?,?)',snapshot.id,id,position,JSON.stringify(item));
        }
        await transaction.runAsync("UPDATE quizzes SET status='ready' WHERE id=?",id);
      });
    },
    async list(notebook:string) { return database.getAllAsync<QuizRow>('SELECT * FROM quizzes WHERE notebook_id=? ORDER BY created_at DESC,rowid DESC LIMIT 50',notebook); },
    async detail(id:string) {
      const quiz=await required<QuizRow>(database,'SELECT * FROM quizzes WHERE id=?',id);
      const items=await database.getAllAsync<ItemRow>('SELECT * FROM quiz_items WHERE quiz_id=? ORDER BY position',id);
      const attempt=await database.getFirstAsync<Attempt>('SELECT * FROM attempts WHERE quiz_id=?',id);
      const responses=attempt?await database.getAllAsync<ResponseRow>('SELECT * FROM responses WHERE attempt_id=?',attempt.id):[];
      return {quiz,items,attempt,responses};
    },
    async start(quizId:string,attemptId:string) {
      let result:Attempt|undefined;
      await database.withExclusiveTransactionAsync(async transaction=>{
        const existing=await transaction.getFirstAsync<Attempt>('SELECT * FROM attempts WHERE quiz_id=?',quizId);
        if(existing) {result=existing;return;}
        const quiz=await required<QuizRow>(transaction,'SELECT * FROM quizzes WHERE id=?',quizId);
        const items=await transaction.getAllAsync<ItemRow>('SELECT * FROM quiz_items WHERE quiz_id=? ORDER BY position',quizId);
        if(quiz.status!=='ready'||items.length!==quiz.question_count) throw new Error('Quiz is not ready');
        const previous:QuizItem[]=[];
        for(const item of items) previous.push(validateQuiz(JSON.parse(item.item_json),JSON.parse(quiz.evidence_json),previous));
        await transaction.runAsync("INSERT INTO attempts(id,quiz_id,status,started_at) VALUES (?,?,'in_progress',?)",attemptId,quizId,new Date().toISOString());
        result=await required<Attempt>(transaction,'SELECT * FROM attempts WHERE id=?',attemptId);
      });return result!;
    },
    async select(attemptId:string,itemId:string,selected:number|null,excluded=false) {
      if(selected!==null&&(!Number.isInteger(selected)||selected<0||selected>3)) throw new Error('Invalid selection');
      await database.withExclusiveTransactionAsync(async transaction=>{
        const attempt=await required<Attempt>(transaction,'SELECT * FROM attempts WHERE id=?',attemptId);
        const item=await required<ItemRow>(transaction,'SELECT * FROM quiz_items WHERE id=?',itemId);
        if(attempt.status!=='in_progress'||item.quiz_id!==attempt.quiz_id) throw new Error('Attempt is not editable');
        await transaction.runAsync('INSERT INTO responses(attempt_id,item_id,selected_index,excluded) VALUES (?,?,?,?) ON CONFLICT(attempt_id,item_id) DO UPDATE SET selected_index=excluded.selected_index,excluded=excluded.excluded',attemptId,itemId,selected,Number(excluded));
      });
    },
    async submit(attemptId:string) {
      let result:Attempt|undefined;
      await database.withExclusiveTransactionAsync(async transaction=>{
        const attempt=await required<Attempt>(transaction,'SELECT * FROM attempts WHERE id=?',attemptId);
        if(attempt.status==='submitted') {result=attempt;return;}
        const quiz=await required<QuizRow>(transaction,'SELECT * FROM quizzes WHERE id=?',attempt.quiz_id);
        const items=await transaction.getAllAsync<ItemRow>('SELECT * FROM quiz_items WHERE quiz_id=? ORDER BY position',quiz.id);
        const responses=await transaction.getAllAsync<ResponseRow>('SELECT * FROM responses WHERE attempt_id=?',attemptId);
        const selections=Object.fromEntries(responses.map(row=>[row.item_id,row.selected_index]));
        const grade=gradeQuiz(items.map(row=>{let item:unknown;try{item=JSON.parse(row.item_json);}catch{item=null;}return {id:row.id,item,evidence:JSON.parse(quiz.evidence_json),excluded:!!responses.find(response=>response.item_id===row.id)?.excluded};}),selections);
        for(const row of grade.responses) await transaction.runAsync('INSERT INTO responses(attempt_id,item_id,selected_index,is_correct,scorable) VALUES (?,?,?,?,?) ON CONFLICT(attempt_id,item_id) DO UPDATE SET is_correct=excluded.is_correct,scorable=excluded.scorable',attemptId,row.id,row.selected,Number(row.isCorrect),Number(row.scorable));
        await transaction.runAsync("UPDATE attempts SET status='submitted',correct_count=?,scorable_count=?,score=?,submitted_at=? WHERE id=?",grade.correct,grade.scorable,grade.score,new Date().toISOString(),attemptId);
        result=await required<Attempt>(transaction,'SELECT * FROM attempts WHERE id=?',attemptId);
      });return result!;
    },
  };
}
export type QuizRepository=ReturnType<typeof createQuizRepository>;
