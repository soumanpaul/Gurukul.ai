import { useEffect,useRef,useState } from 'react';
import { Image,Platform,Pressable,StyleSheet,Text,View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Action,Card,styles } from '../shared/ui';
import type { Foundation } from '../../services/foundation';
import type { PracticeResponse } from '../../domain/progress';
import { practiceSummary } from '../../domain/progress';
import { QuizPanel } from '../study/QuizPanel';
import mascot from '../../../assets/illustrations/book-mascot.png';
type Progress=Awaited<ReturnType<Foundation['progress']['read']>>;
const newId=()=>`practice-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const date=(value:string)=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'Date unavailable';
const score=(correct:number|null,count:number|null,value:number|null)=>value===null?'No score':`${correct} / ${count} correct · ${value}%`;
export function ProgressScreen({foundation,onNavigate}:{foundation:Foundation;onNavigate?:()=>void}){
  const [data,setData]=useState<Progress|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [selected,setSelected]=useState<PracticeResponse|null>(null);const [expanded,setExpanded]=useState<string|null>(null);
  const [details,setDetails]=useState(false);
  const [practice,setPractice]=useState<{quiz:string;notebook:string;repeated:boolean}|null>(null);const guard=useRef(false);
  const repository=foundation.progress;
  useEffect(()=>{onNavigate?.();},[selected,practice,details,onNavigate]);
  useEffect(()=>{let cancelled=false;void repository.read().then(value=>{if(!cancelled)setData(value);}).catch(()=>{if(!cancelled)setError('Could not read progress. Your history was not reset.');});return()=>{cancelled=true;};},[repository]);
  async function perform(work:()=>Promise<void>){
    if(guard.current)return;guard.current=true;setBusy(true);setError('');
    try{await work();setData(await repository.read());}catch{setError('Could not finish. Your original scores and notes were kept. Retry.');}
    finally{guard.current=false;setBusy(false);}
  }
  async function repeat(response:PracticeResponse){
    const quiz=await repository.repeat(response.row.quiz_id,newId(),newId());
    setPractice({quiz,notebook:response.row.notebook_id,repeated:true});
  }
  if(practice)return <QuizPanel key={practice.quiz} foundation={foundation} notebook={practice.notebook} initialQuiz={practice.quiz} repeatPractice={practice.repeated} close={()=>{setPractice(null);setSelected(null);void perform(async()=>{});}}/>;
  if(selected?.item)return <>
    <Action title="← Back to progress" secondary onPress={()=>setSelected(null)}/>
    <Text style={styles.title}>Review this topic</Text>
    <Text style={styles.note}>Saved supporting material · {selected.row.notebook_title}. This revision may precede edits to your notes.</Text>
    <Card><Text style={styles.heading}>{selected.item.prompt}</Text><Text style={styles.body}>Your answer: {selected.row.selected_index===null?'Skipped':selected.item.options[selected.row.selected_index]??'Invalid selection'}</Text><Text style={styles.body}>Source answer: {selected.item.options[selected.item.correctIndex]}</Text><Text style={styles.body}>{selected.item.explanation}</Text></Card>
    {selected.item.citations.map(citation=>{const source=selected.evidence.find(source=>source.chunkId===citation.chunkId)!;return <View key={citation.chunkId} style={[styles.card,{backgroundColor:'#f7eedc'}]}>
      <Text style={styles.heading}>{source.title} · page {source.pageNumber}</Text><Text selectable style={styles.body}>“{citation.quote}”</Text><Text selectable style={styles.body}>{source.text}</Text><Text style={styles.note}>Saved revision {source.revisionId} · section {source.chunkId}</Text>
    </View>;})}
    <Text style={styles.note}>Reread the evidence, then practise the saved quiz again. Same questions, new editable attempt; this is repetition, not independent evidence of improvement. Existing exclusions carry forward and can be reviewed before submission.</Text>
    <Action title="Practise saved quiz again" disabled={busy} onPress={()=>{void perform(()=>repeat(selected));}}/>
    {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </>;
  const summary=data?practiceSummary(data):null;
  if(summary&&!details){
    const {attempt,review,topicCount}=summary;
    const item=review?.item;
    const source=item?review!.evidence.find(entry=>entry.chunkId===item.citations[0].chunkId):null;
    const repeatable=attempt.items.find(response=>response.item);
    return <View style={design.overview}>
      <Text accessibilityRole="header" style={design.heading}>Practice complete</Text>
      <View style={design.hero}>
        <Image source={mascot} style={design.mascot} resizeMode="contain" accessible={false}/>
        <View style={design.scoreCard}><Text accessibilityLabel={attempt.score===null?'No scorable answers':`${attempt.correct} of ${attempt.scorable} correct answers`} style={design.score}>{attempt.score===null?'—':`${attempt.correct} / ${attempt.scorable}`}</Text><Text style={design.body}>{attempt.score===null?'No scorable answers':'correct answers'}</Text><Text style={design.date}>{Number.isFinite(Date.parse(attempt.row.submitted_at??''))?new Date(attempt.row.submitted_at!).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'Date unavailable'}</Text></View>
      </View>
      <Text style={design.caption}>{attempt.row.notebook_title} · Latest submitted practice</Text>
      {attempt.excluded>0&&<Text style={styles.note}>Adjusted count · {attempt.excluded} excluded/invalid. Original: {score(attempt.row.correct_count,attempt.row.scorable_count,attempt.row.score)}.</Text>}
      <Text accessibilityRole="header" style={design.section}>{topicCount===1?'One topic to revisit':topicCount?`${topicCount} topics to revisit`:attempt.score===null?'No scorable responses yet':'All counted answers correct'}</Text>
      {item&&review?<>
        <View style={design.reviewCard}>
          <View style={design.row}><Feather name="alert-circle" color="#a35700" size={22}/><Text style={design.status}>Needs review</Text></View>
          <Text style={design.question}>{item.prompt}</Text>
          <View style={design.row}><Feather name="x-circle" size={22} color="#ae3830"/><Text style={design.answerLabel}>Your answer:</Text><Text style={design.answer}>{review.row.selected_index===null?'Skipped':item.options[review.row.selected_index]}</Text></View>
          <View style={design.row}><Feather name="check-circle" size={22} color="#39734a"/><Text style={design.answerLabel}>Correct answer:</Text><Text style={design.answer}>{item.options[item.correctIndex]}</Text></View>
          <View style={design.explanation}><Text style={design.body}>{item.explanation}</Text></View>
          {source&&<Pressable accessibilityRole="button" accessibilityLabel={`Open source ${source.title}, page ${source.pageNumber}`} style={design.source} onPress={()=>setSelected(review)}><Feather name="file-text" size={18} color="#4c5e5c"/><Text style={design.sourceText}>{source.title} · p. {source.pageNumber}</Text><Feather name="chevron-right" size={16} color="#4c5e5c"/></Pressable>}
        </View>
        <Pressable accessibilityRole="button" style={design.primary} onPress={()=>setSelected(review)}><Text style={design.primaryText}>Review this topic</Text></Pressable>
      </>:<View style={design.reviewCard}><Text style={design.body}>{attempt.score===null?'Excluded or invalid responses do not count toward progress. Inspect the saved answers and flags in your history.':'No wrong or skipped answers in this attempt. Revisit the notes whenever you need a refresher.'}</Text></View>}
      <Pressable accessibilityRole="button" accessibilityState={{disabled:busy||!repeatable}} disabled={busy||!repeatable} style={[design.secondary,(busy||!repeatable)&&styles.disabled]} onPress={()=>{if(repeatable)void perform(()=>repeat(repeatable));}}><Text style={design.secondaryText}>{busy?'Preparing…':'Practice again'}</Text></Pressable>
      <Text style={design.caption}>Based on 1 attempt · Not a mastery score.</Text>
      <Text style={design.caption}>Practice again repeats the saved questions, not new independent evidence.{attempt.repeats?` ${attempt.repeats} repeated question(s) in this result.`:''}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="View all progress & history" style={design.history} onPress={()=>setDetails(true)}><Text style={design.historyText}>View all progress & history</Text><Feather name="chevron-right" color="#086c70" size={18}/></Pressable>
      {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>;
  }
  return <>
    {summary&&<Action title="← Back to latest result" secondary onPress={()=>setDetails(false)}/>}
    <View style={{flexDirection:'row',alignItems:'center',gap:16}}><Image source={mascot} style={{width:85,height:96}} accessible={false}/><Text style={[styles.title,{flex:1}]}>Your practice</Text></View>
    <Text style={styles.note}>Practice results, not a mastery score or prediction. Topics are saved source sections, kept separate by notebook and revision.</Text>
    {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Action title={busy?'Updating…':'Refresh progress'} secondary disabled={busy} onPress={()=>{void perform(async()=>{});}}/>
    {!data&&!error&&<Text style={styles.note}>Reading saved attempts…</Text>}
    {data&&!data.history.length&&<Card><Text style={styles.heading}>No attempts yet</Text><Text style={styles.body}>Open a notebook → Study → Quiz. Submitted practice will appear here; no scores are invented.</Text></Card>}
    {!!data?.history.length&&<><Text style={styles.heading}>Topics to revisit</Text>
      {!data.topics.length&&<Card><Text style={styles.body}>No scorable observations yet. Unfinished, invalid and excluded responses do not count.</Text></Card>}
      {data.topics.map(topic=><View key={topic.id} style={[styles.card,topic.wrong&&{backgroundColor:'#f7eedc'}]}>
        <Text style={styles.note}>{topic.notebook}</Text><Text style={styles.heading}>{topic.label}</Text>
        <Text style={styles.body}>{topic.correct} / {topic.count} correct · {Math.round(topic.accuracy)}% · latest up to 10 valid responses</Text>
        <Text style={styles.note}>{topic.limited?'Limited evidence · fewer than 3 observations.':topic.priority?'Priority review · at least 3 observations and below 70%.':topic.wrong?'Needs review · a saved response was wrong or skipped.':'No wrong answers in this window · keep practising.'}</Text>
        <Text style={styles.note}>{topic.unique} distinct question(s) · {topic.repeats} repeated response(s). Repeats are included as practice, not independent mastery evidence.</Text>
        {topic.wrong&&<><Text style={styles.body}>Revisit: {topic.wrong.item!.prompt}</Text><Text style={styles.note}>Wrong or skipped on {date(topic.wrong.row.submitted_at!)}.</Text><Action title="Review this topic · supporting notes" secondary onPress={()=>setSelected(topic.wrong!)}/></>}
      </View>)}
      <Text style={styles.heading}>Dated attempt history</Text>
      {data.history.slice(0,100).map(attempt=><Card key={attempt.row.attempt_id}>
        <Text style={styles.heading}>{attempt.row.notebook_title}</Text><Text style={styles.note}>{date(attempt.row.submitted_at??attempt.row.started_at)} · {attempt.row.status==='submitted'?'Submitted':'In progress · not counted'}</Text>
        {attempt.row.status==='submitted'?<>
          <Text style={styles.body}>Original submission: {score(attempt.row.correct_count,attempt.row.scorable_count,attempt.row.score)}</Text>
          <Text style={styles.body}>Adjusted progress: {score(attempt.correct,attempt.scorable,attempt.score)} · {attempt.excluded} excluded/invalid</Text>
          <Text style={styles.note}>{attempt.repeats} repeated question(s). Original score and answer evidence are unchanged.</Text>
          <Action title={expanded===attempt.row.attempt_id?'Hide answer review':'Review answers · flag ambiguity'} secondary onPress={()=>setExpanded(expanded===attempt.row.attempt_id?null:attempt.row.attempt_id)}/>
          {expanded===attempt.row.attempt_id&&attempt.items.map(response=><View key={response.row.item_id??'missing'} style={{gap:10,paddingVertical:12,borderTopWidth:1,borderColor:'#e5dfd7'}}>
            <Text style={styles.body}>{response.item?.prompt??'Unavailable question'}</Text>
            <Text style={styles.note}>{!response.included?response.reason:response.correct?'Correct':'Needs review · wrong or skipped'}{response.repeated?' · Repeated question':''}</Text>
            {response.item&&<Action title="Open supporting notes · relearn" secondary onPress={()=>setSelected(response)}/>}
            {response.row.item_id&&!response.row.excluded&&<Action title={response.row.flagged?'Remove progress flag':'Flag ambiguous · exclude from progress'} secondary disabled={busy} onPress={()=>{void perform(()=>repository.flag(response.row.attempt_id,response.row.item_id!,!response.row.flagged));}}/>}
          </View>)}
        </>:<Action title="Resume saved attempt" secondary disabled={busy} onPress={()=>setPractice({quiz:attempt.row.quiz_id,notebook:attempt.row.notebook_id,repeated:!!attempt.row.parent_quiz_id||attempt.repeats>0})}/>}
      </Card>)}
      {data.history.length>100&&<Text style={styles.note}>Showing the latest 100 attempts. Topic summaries use all retained history to choose the latest 10 valid responses per section.</Text>}
    </>}
  </>;
}

const serif=Platform.OS==='ios'?'Georgia':'serif';
const design=StyleSheet.create({
  overview:{gap:10},
  heading:{fontFamily:serif,fontSize:23,fontWeight:'700',color:'#102532',textAlign:'center',marginBottom:8},
  hero:{flexDirection:'row',alignItems:'center',gap:12},
  mascot:{width:'46%',height:130},
  scoreCard:{flex:1,minHeight:126,borderRadius:18,backgroundColor:'#f9f0df',padding:12,justifyContent:'center',alignItems:'center',gap:5},
  score:{fontFamily:serif,fontStyle:'italic',fontWeight:'700',fontSize:39,color:'#123d45'},
  body:{fontSize:15,lineHeight:22,color:'#172e39'},
  date:{fontSize:13,color:'#4c5e5c',marginTop:12,textAlign:'center'},
  section:{fontFamily:serif,fontWeight:'700',fontSize:22,color:'#102532',marginTop:4},
  reviewCard:{borderRadius:16,borderWidth:1,borderColor:'#edcca0',backgroundColor:'#fff3e3',padding:14,gap:8},
  row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
  status:{fontSize:15,fontWeight:'600',color:'#965000'},
  question:{fontFamily:serif,fontSize:20,lineHeight:26,fontWeight:'700',color:'#102532'},
  answerLabel:{fontSize:14,color:'#172e39'},
  answer:{fontSize:15,color:'#172e39',flexGrow:1,flexShrink:1},
  explanation:{borderTopWidth:1,borderColor:'#eddfca',paddingTop:12},
  source:{flexDirection:'row',alignItems:'center',gap:7,minHeight:48},
  sourceText:{fontSize:13,lineHeight:19,color:'#4c5e5c',flex:1},
  primary:{minHeight:48,backgroundColor:'#086c70',borderRadius:15,justifyContent:'center',padding:12},
  primaryText:{fontFamily:serif,fontSize:18,fontWeight:'700',textAlign:'center',color:'#ffffff'},
  secondary:{minHeight:48,borderWidth:1,borderColor:'#086c70',borderRadius:15,justifyContent:'center',padding:12},
  secondaryText:{fontFamily:serif,fontSize:18,fontWeight:'700',textAlign:'center',color:'#075e63'},
  caption:{fontSize:12,lineHeight:17,color:'#4c5e5c',textAlign:'center'},
  history:{minHeight:48,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:6},
  historyText:{fontSize:14,color:'#086c70',textDecorationLine:'underline',flexShrink:1},
});
