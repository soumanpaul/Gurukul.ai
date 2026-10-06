import { validateQuiz } from './quiz.ts';
import type { QuizItem } from './quiz.ts';
import type { Evidence } from './study.ts';

export interface ProgressRow {
  attempt_id:string; quiz_id:string; notebook_id:string; notebook_title:string; status:string;
  started_at:string; submitted_at:string|null; correct_count:number|null; scorable_count:number|null; score:number|null;
  item_id:string|null; item_json:string|null; evidence_json:string; selected_index:number|null;
  excluded:number|null; scorable:number|null; is_correct:number|null; flagged:number; parent_quiz_id:string|null;
}
export interface PracticeResponse {
  row:ProgressRow; item:QuizItem|null; evidence:Evidence[]; valid:boolean; included:boolean; correct:boolean;
  repeated:boolean; fingerprint:string; reason:string;
}
const compare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const canonical=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function practiceSummary(data:ReturnType<typeof deriveProgress>) {
  const attempt=data.history.find(entry=>entry.row.status==='submitted');
  if(!attempt)return null;
  const wrong=attempt.items.filter(response=>response.included&&!response.correct);
  return {attempt,review:wrong[0]??null,topicCount:new Set(wrong.map(response=>response.item!.topicId)).size};
}
export function deriveProgress(rows:ProgressRow[]) {
  const seenResponses=new Set<string>();
  const seenQuestions=new Set<string>();
  const ordered=[...rows].sort((left,right)=>compare(left.submitted_at??left.started_at,right.submitted_at??right.started_at)||compare(left.attempt_id,right.attempt_id)||compare(left.item_id??'',right.item_id??''));
  const responses:PracticeResponse[]=[];
  for(const row of ordered){
    const identity=JSON.stringify([row.attempt_id,row.item_id]);
    if(seenResponses.has(identity))continue;seenResponses.add(identity);
    let item:QuizItem|null=null;let evidence:Evidence[]=[];
    try{
      const parsed:unknown=JSON.parse(row.evidence_json);
      if(!Array.isArray(parsed)||!parsed.every(source=>source&&typeof source.chunkId==='string'&&typeof source.revisionId==='string'&&typeof source.documentId==='string'&&typeof source.title==='string'&&typeof source.text==='string'&&Number.isInteger(source.pageNumber)&&source.pageNumber>0))throw new Error('Invalid saved evidence');
      evidence=parsed;item=validateQuiz(JSON.parse(row.item_json??'null'),evidence);
    }catch{item=null;evidence=[];}
    const fingerprint=item?JSON.stringify([row.notebook_id,canonical(item.prompt),canonical(item.options[item.correctIndex])]):'';
    const repeated=!!fingerprint&&(seenQuestions.has(fingerprint)||!!row.parent_quiz_id);
    if(fingerprint&&row.status==='submitted')seenQuestions.add(fingerprint);
    const selectedValid=row.selected_index===null||(Number.isInteger(row.selected_index)&&row.selected_index>=0&&row.selected_index<4);
    const correct=!!item&&row.selected_index===item.correctIndex;
    const valid=!!item&&selectedValid&&row.scorable===1&&row.is_correct===Number(correct)&&!!row.submitted_at&&Number.isFinite(Date.parse(row.submitted_at));
    const reason=!item?'Invalid saved question/evidence':row.excluded?'Excluded at submission':row.flagged?'Flagged ambiguous':!valid?'Unscorable or invalid response':'';
    responses.push({row,item,evidence,valid,included:row.status==='submitted'&&valid&&!row.excluded&&!row.flagged,correct,repeated,fingerprint,reason});
  }
  const attempts=new Map<string,PracticeResponse[]>();
  for(const response of responses){const group=attempts.get(response.row.attempt_id)??[];group.push(response);attempts.set(response.row.attempt_id,group);}
  const history=[...attempts.values()].map(items=>{
    const row=items[0].row;const counted=items.filter(item=>item.included);const correct=counted.filter(item=>item.correct).length;
    return {row,items,correct,scorable:counted.length,score:counted.length?Math.round(100*correct/counted.length):null,
      excluded:items.filter(item=>item.row.item_id&&!item.included).length,repeats:items.filter(item=>item.repeated).length};
  }).reverse();
  const groups=new Map<string,PracticeResponse[]>();
  const wrongs=new Map<string,PracticeResponse>();
  for(const response of [...responses].reverse()){
    if(!response.included)continue;
    const key=JSON.stringify([response.row.notebook_id,response.item!.topicId]);
    if(!response.correct&&!wrongs.has(key))wrongs.set(key,response);
    const group=groups.get(key)??[];if(group.length<10)group.push(response);groups.set(key,group);
  }
  const topics=[...groups.entries()].map(([id,items])=>{
    const correct=items.filter(item=>item.correct).length;const accuracy=100*correct/items.length;
    const wrong=wrongs.get(id);
    const source=items[0].evidence.find(source=>source.chunkId===items[0].item!.citations[0].chunkId)!;
    return {id,items,correct,count:items.length,accuracy,limited:items.length<3,priority:items.length>=3&&accuracy<70,
      wrong,label:`${source.title} · page ${source.pageNumber}`,notebook:items[0].row.notebook_title,
      unique:new Set(items.map(item=>item.fingerprint)).size,repeats:items.filter(item=>item.repeated).length};
  }).sort((left,right)=>Number(right.priority)-Number(left.priority)||Number(!!right.wrong)-Number(!!left.wrong)
    ||compare(right.wrong?.row.submitted_at??'',left.wrong?.row.submitted_at??'')||left.accuracy-right.accuracy||compare(left.id,right.id));
  return {history,topics};
}
