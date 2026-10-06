import { useEffect,useRef,useState,useSyncExternalStore } from 'react';
import { Alert,Image,Pressable,Text,View } from 'react-native';
import type { Foundation } from '../../services/foundation';
import type { Evidence } from '../../domain/study';
import type { QuizItem } from '../../domain/quiz';
import { validateQuiz } from '../../domain/quiz';
import type { QuizRow,QuizRepository } from '../../adapters/sqlite/quizzes';
import { getQuizManager } from '../../adapters/model/quiz';
import { modelNativeAvailable } from '../../adapters/model/native';
import { importId } from '../../adapters/imports/native';
import { Action,Card,styles } from '../shared/ui';
import mascot from '../../../assets/illustrations/book-mascot.png';
const idle={busy:false,progress:'',error:'',quizId:'',calls:0};
const subscribeIdle=()=>()=>{};const snapshotIdle=()=>idle;
type Detail=Awaited<ReturnType<QuizRepository['detail']>>;
export function QuizPanel({foundation,notebook,section,close,initialQuiz,repeatPractice}:{foundation:Foundation;notebook:string;section?:string;close():void;initialQuiz?:string;repeatPractice?:boolean}){
  const repository=foundation.quizzes;
  const [manager]=useState(()=>modelNativeAvailable?getQuizManager(foundation):null);
  const work=useSyncExternalStore(manager?.subscribe??subscribeIdle,manager?.snapshot??snapshotIdle);
  const [count,setCount]=useState<3|5>(3);const [quizzes,setQuizzes]=useState<QuizRow[]>([]);
  const [detail,setDetail]=useState<Detail|null>(null);const [position,setPosition]=useState(0);
  const [repetition,setRepetition]=useState({copied:false,repeated:false});
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const guard=useRef(false);
  useEffect(()=>{void repository.list(notebook).then(setQuizzes).catch(()=>setError('Could not read quiz history.'));},[repository,notebook,work.busy]);
  useEffect(()=>{if(initialQuiz)void repository.detail(initialQuiz).then(setDetail).catch(()=>setError('Could not open saved practice. Return to Progress and retry.'));},[initialQuiz,repository]);
  const quizId=detail?.quiz.id;
  useEffect(()=>{
    let cancelled=false;setRepetition({copied:false,repeated:false});
    if(quizId)void foundation.progress.read().then(progress=>{
      const attempt=progress.history.find(attempt=>attempt.row.quiz_id===quizId);
      if(!cancelled)setRepetition({copied:!!attempt?.row.parent_quiz_id,repeated:!!attempt?.repeats});
    }).catch(()=>{if(!cancelled)setError('Could not check repeated-question history. Do not treat this practice as independent evidence.');});
    return()=>{cancelled=true;};
  },[foundation.progress,quizId]);
  async function perform(action:()=>Promise<void>){
    if(guard.current)return;guard.current=true;setBusy(true);setError('');
    try{await action();}catch{setError('Could not save or validate this quiz. Your previous answers were kept. Retry.');}
    finally{guard.current=false;setBusy(false);}
  }
  async function open(id:string){await repository.start(id,importId());setDetail(await repository.detail(id));setPosition(0);}
  if(initialQuiz&&!detail)return <><Text style={styles.note}>{error||'Opening saved practice…'}</Text><Action title="Back to progress" onPress={close}/></>;
  if(!detail)return <>
    <Action title="← Back to study" secondary onPress={close}/>
    <View style={{flexDirection:'row',gap:12,alignItems:'center'}}><Image source={mascot} style={{width:85,height:95}} accessible={false}/><Text style={styles.heading}>Practice from your notes</Text></View>
    <Text style={styles.note}>{section?'Uses the selected section.':'Uses up to five selected source sections.'} Generated on this device, never a curated sample. Questions can still be ambiguous; flag them before submitting.</Text>
    <Text style={styles.note}>Source-sentence MCQs: choose the missing word in a quoted sentence. This conservative mode avoids unsupported free-form questions.</Text>
    <View style={{flexDirection:'row',gap:12}}>{([3,5] as const).map(size=><Action key={size} title={`${count===size?'✓ ':''}${size} questions`} secondary disabled={work.busy||busy} onPress={()=>setCount(size)}/>)}</View>
    <Action title={`Generate ${count} questions locally`} disabled={!manager||work.busy||busy} onPress={()=>{void perform(async()=>{const id=await manager!.generate(notebook,count,section);if(id)await open(id);});}}/>
    {work.busy&&<><Text accessibilityLiveRegion="polite" style={styles.note}>{work.progress}</Text><Action title="Cancel generation" secondary onPress={()=>{void manager?.cancel().catch(()=>setError('Stopping native work. Please wait.'));}}/></>}
    {(error||work.error)&&<Text accessibilityRole="alert" style={styles.error}>{error||work.error}</Text>}
    <Text style={styles.heading}>Quizzes and attempts</Text>
    {!quizzes.length&&<Text style={styles.note}>No quizzes yet. A full validated snapshot is required before practice starts.</Text>}
    {quizzes.map(quiz=><Card key={quiz.id}><Text style={styles.body}>{quiz.question_count} questions · {quiz.status}</Text><Text style={styles.note}>{new Date(quiz.created_at).toLocaleString()}</Text>{quiz.error&&<Text style={styles.error}>{quiz.error}</Text>}<Action title="Open saved attempt" secondary disabled={quiz.status!=='ready'||busy||work.busy||!manager} onPress={()=>{void perform(()=>open(quiz.id));}}/></Card>)}
  </>;
  let evidence:Evidence[];
  let items:QuizItem[];
  try{
    evidence=JSON.parse(detail.quiz.evidence_json);
    if(!Array.isArray(evidence)||!detail.attempt||![3,5].includes(detail.items.length)||detail.items.length!==detail.quiz.question_count||position>=detail.items.length)throw new Error('Invalid snapshot');
    items=detail.items.map(row=>validateQuiz(JSON.parse(row.item_json),evidence));
  }catch{return <><Text accessibilityRole="alert" style={styles.error}>Quiz snapshot failed validation. It cannot be played.</Text><Action title="Back" onPress={()=>initialQuiz?close():setDetail(null)}/></>;}
  const attempt=detail.attempt!;const submitted=attempt.status==='submitted';
  const row=detail.items[position];const item=items[position];
  const response=detail.responses.find(response=>response.item_id===row.id);
  async function select(selected:number|null,excluded=false){await repository.select(attempt.id,row.id,selected,excluded);setDetail(await repository.detail(detail!.quiz.id));}
  function submit(){
    const skipped=detail!.items.filter(item=>!detail!.responses.some(response=>response.item_id===item.id&&response.selected_index!==null&& !response.excluded)).length;
    Alert.alert('Submit answers?',`${skipped} skipped or excluded. Unanswered scorable questions count as incorrect. You cannot edit after submitting.`,[
      {text:'Keep editing',style:'cancel'}, {text:'Submit answers',onPress:()=>{void perform(async()=>{await repository.submit(attempt.id);setDetail(await repository.detail(detail!.quiz.id));});}},
    ]);
  }
  return <>
    <Action title={initialQuiz?'← Progress · keep saved answers':'← Quizzes · keep saved answers'} secondary disabled={busy} onPress={()=>initialQuiz?close():setDetail(null)}/>
    {(repeatPractice||repetition.copied)&&<Text style={styles.note}>Repeated practice · saved questions and source revision, not new model generation or independent mastery evidence.</Text>}
    {!repeatPractice&&!repetition.copied&&repetition.repeated&&<Text style={styles.note}>Includes questions seen in earlier practice. Repeated questions are not independent mastery evidence.</Text>}
    {submitted?<>
      <Image source={mascot} style={{width:100,height:112,alignSelf:'center'}} accessible={false}/>
      <Text style={styles.title}>Practice complete</Text>
      <Card><Text style={styles.title}>{attempt.score===null?'No score':`${attempt.correct_count} / ${attempt.scorable_count} · ${attempt.score}%`}</Text><Text style={styles.note}>Correct / scorable. Excluded questions do not count. One attempt is not a mastery score.</Text></Card>
      {items.map((item,index)=>{const saved=detail.responses.find(response=>response.item_id===detail.items[index].id);return <Card key={detail.items[index].id}>
        <Text style={styles.heading}>{!saved?.scorable?'Excluded':saved.is_correct?'Correct':'Needs review'} · {item.prompt}</Text>
        <Text style={styles.body}>Your answer: {saved?.selected_index==null?'Skipped':item.options[saved.selected_index]}</Text>
        <Text style={styles.body}>Correct answer: {item.options[item.correctIndex]}</Text><Text style={styles.body}>{item.explanation}</Text>
        <QuizCitations item={item} evidence={evidence}/>
      </Card>;})}
    </>:<>
      <Text style={styles.note}>Question {position+1} of {items.length}</Text>
      <Text style={styles.note}>Choose the word that completes the source sentence.</Text>
      <View style={{height:7,borderRadius:7,backgroundColor:'#e5dfd7'}}><View style={{height:7,borderRadius:7,backgroundColor:'#086c70',width:`${100*(position+1)/items.length}%`}}/></View>
      <Text style={styles.heading}>{item.prompt}</Text>
      {item.options.map((option,index)=><Pressable key={index} accessibilityRole="radio" accessibilityState={{checked:response?.selected_index===index,disabled:busy}} disabled={busy} onPress={()=>{void perform(()=>select(index,!!response?.excluded));}} style={{padding:16,minHeight:52,borderRadius:14,borderWidth:1,borderColor:response?.selected_index===index?'#086c70':'#e5dfd7',backgroundColor:response?.selected_index===index?'#d9eeea':'#fffcf7'}}><Text style={styles.body}>{response?.selected_index===index?'●':'○'} {option}</Text></Pressable>)}
      <Text style={styles.note}>Selections save locally. Change them before submission; no score or key is shown early.</Text>
      <Action title="Clear answer · skip" secondary disabled={busy} onPress={()=>{void perform(()=>select(null,!!response?.excluded));}}/>
      <Action title={response?.excluded?'Unflag · include this question':'Flag ambiguous · exclude from score'} secondary disabled={busy} onPress={()=>{void perform(()=>select(response?.selected_index??null,!response?.excluded));}}/>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12,justifyContent:'space-between'}}><Action title="Previous" secondary disabled={busy||position===0} onPress={()=>setPosition(position-1)}/><Action title="Next" disabled={busy||position===items.length-1} onPress={()=>setPosition(position+1)}/></View>
      {position===items.length-1&&<Action title="Submit answers" disabled={busy} onPress={submit}/>}
    </>}
    {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </>;
}
function QuizCitations({item,evidence}:{item:QuizItem;evidence:Evidence[]}){
  const [open,setOpen]=useState(false);
  return <><Action title="View supporting notes" secondary onPress={()=>setOpen(!open)}/>{open&&item.citations.map(citation=>{const source=evidence.find(source=>source.chunkId===citation.chunkId)!;return <View key={source.chunkId} style={{padding:12,gap:8,borderRadius:12,backgroundColor:'#f7eedc'}}><Text style={styles.note}>{source.title} · page {source.pageNumber} · saved revision {source.revisionId}</Text><Text selectable style={styles.body}>“{citation.quote}”</Text><Text selectable style={styles.body}>{source.text}</Text><Text style={styles.note}>This snapshot may precede later source edits. Source support does not guarantee question quality.</Text></View>;})}</>;
}
