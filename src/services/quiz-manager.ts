import type { Evidence } from '../domain/study.ts';
import { safeGenerationError } from '../domain/experience.ts';
import { deduplicate } from '../domain/study.ts';
import { parseQuiz, quizMessages, quizPromptVersion, quizSchemaFor } from '../domain/quiz.ts';
import type { QuizItem } from '../domain/quiz.ts';
import type { QuizRepository } from '../adapters/sqlite/quizzes.ts';
import type { StudyRuntime } from './study-manager.ts';
interface QuizPorts { id():string; model:string; sections(notebook:string):Promise<Evidence[]>; load():Promise<StudyRuntime>; observeCandidate?(candidate:{index:number;repair:number;text:string;truncated:boolean;validation:string}):void }
export class QuizManager {
  private repository:QuizRepository;
  private ports:QuizPorts;
  private runtime:StudyRuntime|null=null;
  private cancelled=false;
  private foreground=true;
  private listeners=new Set<()=>void>();
  private current={busy:false,progress:'',error:'',quizId:'',calls:0};
  constructor(repository:QuizRepository,ports:QuizPorts){this.repository=repository;this.ports=ports;}
  snapshot=()=>this.current;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private update(patch:Partial<typeof this.current>){this.current={...this.current,...patch};this.listeners.forEach(listener=>listener());}
  private check(){if(this.cancelled||!this.foreground)throw new Error('Cancelled');}
  async cancel(){this.cancelled=true;this.update({progress:'Stopping after the current native operation…'});await this.runtime?.stop();}
  async setForeground(active:boolean){this.foreground=active;if(!active&&this.current.busy)await this.cancel();}
  async generate(notebook:string,count:3|5,section?:string){
    if(this.current.busy||!this.foreground)return;
    this.cancelled=false;this.update({busy:true,progress:'Reading selected source sections…',error:'',quizId:'',calls:0});
    let id='';
    try{
      if(count!==3&&count!==5)throw new Error('Choose 3 or 5 questions.');
      const all=await this.ports.sections(notebook);
      const evidence=deduplicate(section?all.filter(item=>item.chunkId===section):all).slice(0,5);
      if(!evidence.length)throw new Error('Select reviewed sources first. No quiz was invented.');
      this.check();id=this.ports.id();
      await this.repository.begin({id,notebook,count,evidence,model:this.ports.model,prompt:quizPromptVersion});
      this.update({quizId:id,progress:'Verifying and loading local teacher…'});
      this.runtime=await this.ports.load();this.check();
      const items:QuizItem[]=[];
      for(let index=0;index<count;index++){
        let accepted:QuizItem|undefined;
        const source=evidence[index%evidence.length];
        for(let repair=0;repair<2;repair++){
          this.check();const messages=quizMessages(source,items,repair===1);
          if(await this.runtime.count(messages)>1450)throw new Error('Section or previous questions exceed the token budget. Choose a shorter section.');
          this.check();this.update({progress:`Question ${index+1} of ${count}${repair?' · one repair':''}…`,calls:this.current.calls+1});
          let timedOut=false;
          const timer=setTimeout(()=>{timedOut=true;void this.runtime?.stop().catch(()=>{});},30000);
          let output;
          try{output=await this.runtime.generate(messages,quizSchemaFor(source));}finally{clearTimeout(timer);}
          this.check();if(timedOut)throw new Error('Local generation timed out. Try a shorter section.');
          try{
            if(output.truncated)throw new Error('Truncated output');
            accepted=parseQuiz(output.text,[source],items);
            this.ports.observeCandidate?.({index,repair,...output,validation:'valid'});break;
          }catch(error){
            const reason=error instanceof SyntaxError?'Malformed JSON':error instanceof Error?error.message:'Invalid output';
            this.ports.observeCandidate?.({index,repair,...output,validation:reason});
            if(repair===1)throw new Error('Question validation failed after one repair. No scored quiz was created. Try another section.');
          }
        }
        items.push(accepted!);
      }
      this.check();await this.repository.publish(id,items.map(item=>({id:this.ports.id(),item})));return id;
    }catch(error){
      const message=this.cancelled?'Generation cancelled. No partial quiz is playable.':safeGenerationError(error);
      if(id)await this.repository.fail(id,this.cancelled?'cancelled':'failed',message).catch(()=>this.update({error:'Could not save status. Restart will recover unfinished generation.'}));
      this.update({error:this.current.error||message});
    }finally{
      try{await this.runtime?.release();}catch{this.update({error:'Teacher release failed. Restart before more native work.'});}
      this.runtime=null;this.update({busy:false,progress:''});
    }
  }
}
