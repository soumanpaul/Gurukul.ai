import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {deriveProgress,practiceSummary} from '../src/domain/progress.ts';
import {topicFor} from '../src/domain/quiz.ts';
import {migrate} from '../src/db/migrate.ts';
import {foundationMigration} from '../src/db/migrations/001-foundation.ts';
import {modelMigration} from '../src/db/migrations/002-model-installations.ts';
import {importsMigration} from '../src/db/migrations/003-imports.ts';
import {studyMigration} from '../src/db/migrations/004-study.ts';
import {quizMigration} from '../src/db/migrations/005-quizzes.ts';
import {progressMigration} from '../src/db/migrations/006-progress.ts';
import {createQuizRepository} from '../src/adapters/sqlite/quizzes.ts';
import {createProgressRepository} from '../src/adapters/sqlite/progress.ts';
const prior=[foundationMigration,modelMigration,importsMigration,studyMigration,quizMigration];
const evidence=[{chunkId:'section',documentId:'doc',revisionId:'revision',pageNumber:2,title:'Printed notes',text:'Plants use sunlight. Roots absorb water. Leaves contain chlorophyll.',start:0,end:70}];
const facts=[['sunlight','Plants use sunlight.'],['water','Roots absorb water.'],['chlorophyll','Leaves contain chlorophyll.']];
const item=position=>({prompt:facts[position][1].replace(facts[position][0],'____'),options:[facts[position][0],'stone','plastic','metal'],correctIndex:0,explanation:facts[position][1],topicId:topicFor(evidence[0]),citations:[{chunkId:'section',quote:facts[position][1]}]});
function response(index,correct=true,patch={}){
  return {attempt_id:`attempt-${String(index).padStart(3,'0')}`,quiz_id:`quiz-${index}`,notebook_id:'notebook',notebook_title:'Science',status:'submitted',started_at:'2026-10-01T00:00:00Z',submitted_at:`2026-10-${String(index+1).padStart(2,'0')}T00:00:00Z`,correct_count:Number(correct),scorable_count:1,score:correct?100:0,item_id:`item-${index}`,item_json:JSON.stringify(item(index%3)),evidence_json:JSON.stringify(evidence),selected_index:correct?0:1,excluded:0,scorable:1,is_correct:Number(correct),flagged:0,parent_quiz_id:null,...patch};
}
async function setup(upgrade=true){
  const connection=new DatabaseSync(':memory:');
  const database={async execAsync(sql){connection.exec(sql);},async runAsync(sql,...params){return connection.prepare(sql).run(...params);},async getFirstAsync(sql,...params){return connection.prepare(sql).get(...params)??null;},async getAllAsync(sql,...params){return connection.prepare(sql).all(...params);},async withExclusiveTransactionAsync(work){connection.exec('BEGIN IMMEDIATE');try{await work(database);connection.exec('COMMIT');}catch(error){connection.exec('ROLLBACK');throw error;}}};
  await migrate(database,prior);
  const quizzes=createQuizRepository(database);const notebook=connection.prepare('SELECT id FROM notebooks').get().id;
  await quizzes.begin({id:'parent',notebook,count:3,evidence,model:'declared-unit-double',prompt:'test'});
  await quizzes.publish('parent',[0,1,2].map(position=>({id:`original-${position}`,item:item(position)})));
  await quizzes.start('parent','original');await quizzes.select('original','original-0',0);await quizzes.select('original','original-1',1);
  const submitted=await quizzes.submit('original');
  if(upgrade)await migrate(database);
  return {connection,database,quizzes,notebook,submitted,progress:createProgressRepository(database)};
}
test('result overview uses latest submitted attempt, adjusted counts and only its own valid missed evidence',()=>{
  assert.equal(practiceSummary(deriveProgress([])),null);
  const unfinished=response(3,false,{status:'in_progress',submitted_at:null});
  assert.equal(practiceSummary(deriveProgress([unfinished])),null);
  const summary=practiceSummary(deriveProgress([response(0,false),response(1,false,{selected_index:null}),unfinished]));
  assert.equal(summary.attempt.row.attempt_id,'attempt-001');
  assert.equal(summary.review.row.selected_index,null);
  assert.equal(summary.topicCount,1);
  assert.equal(summary.attempt.correct,0);
  const correct=practiceSummary(deriveProgress([response(0,false),response(1,true)]));
  assert.equal(correct.review,null);
  assert.equal(correct.topicCount,0);
  const excluded=practiceSummary(deriveProgress([response(2,false,{flagged:1})]));
  assert.equal(excluded.attempt.score,null);
  assert.equal(excluded.review,null);
  assert.equal(excluded.attempt.excluded,1);
  const invalid=practiceSummary(deriveProgress([response(2,false,{item_json:'{}'})]));
  assert.equal(invalid.review,null);
  assert.equal(invalid.attempt.scorable,0);
});
test('latest ten valid responses, exact 70% boundary, limited evidence and notebook isolation',()=>{
  const rows=Array.from({length:12},(_,index)=>response(index,index>=5));
  const topic=deriveProgress(rows).topics[0];assert.equal(topic.count,10);assert.equal(topic.correct,7);assert.equal(topic.priority,false);assert.equal(topic.limited,false);
  rows[5]=response(5,false);assert.equal(deriveProgress(rows).topics[0].priority,true);
  assert.equal(deriveProgress(rows.slice(0,2)).topics[0].limited,true);assert.equal(deriveProgress(rows.slice(0,2)).topics[0].priority,false);
  const split=deriveProgress([...rows,response(20,false,{notebook_id:'different'})]);assert.equal(split.topics.length,2);
  assert.equal(split.topics.find(topic=>topic.items[0].row.notebook_id==='different').count,1);
});
test('deterministic timestamp/ID ties, repeat detection across fresh IDs/options, no duplicate observations',()=>{
  const rows=[response(0),response(1,false),response(2),response(3,true,{item_json:JSON.stringify({...item(0),options:['sunlight','glass','paper','wood']})})].map(row=>({...row,submitted_at:'2026-10-01T12:00:00Z'}));
  const first=deriveProgress(rows);assert.deepEqual(first,deriveProgress([...rows].reverse()));assert.deepEqual(first,deriveProgress([...rows,rows[0]]));
  assert.equal(first.history[0].items[0].repeated,true);assert.equal(first.topics[0].unique,3);assert.equal(first.topics[0].repeats,1);
  assert.equal(first.topics[0].wrong.row.attempt_id,'attempt-001');
});
test('flags, invalid JSON/evidence/key, bad selection/grade and unfinished attempts never contribute',()=>{
  const bad=[{flagged:1},{excluded:1},{item_json:'{'},{evidence_json:'null'},{item_json:JSON.stringify({...item(0),correctIndex:9})},{selected_index:9},{is_correct:0},{scorable:0},{submitted_at:'bad-date'},{status:'in_progress',submitted_at:null}];
  const result=deriveProgress(bad.map((patch,index)=>response(index,true,patch)));
  assert.equal(result.topics.length,0);assert.ok(result.history.every(attempt=>attempt.score===null&&attempt.scorable===0));
  const valid=Array.from({length:12},(_,index)=>response(index));valid[11].flagged=1;
  const topic=deriveProgress(valid).topics[0];assert.equal(topic.count,10);assert.equal(topic.items[0].row.attempt_id,'attempt-010');assert.equal(topic.items[9].row.attempt_id,'attempt-001');
});
test('wrong evidence remains reviewable outside latest ten and old revisions are not merged',()=>{
  const rows=Array.from({length:12},(_,index)=>response(index,index!==0));const topic=deriveProgress(rows).topics[0];
  assert.equal(topic.correct,10);assert.equal(topic.priority,false);assert.equal(topic.wrong.row.attempt_id,'attempt-000');
  const changedEvidence=[{...evidence[0],chunkId:'new-section',revisionId:'new-revision'}];
  rows.push(response(15,true,{evidence_json:JSON.stringify(changedEvidence),item_json:JSON.stringify({...item(0),topicId:topicFor(changedEvidence[0]),citations:[{chunkId:'new-section',quote:facts[0][1]}]})}));
  assert.equal(deriveProgress(rows).topics.length,2);assert.equal(deriveProgress(rows).history[0].items[0].repeated,true);
});
test('T5 upgrade preserves immutable grades; flags persist, adjust counts and can be undone without changing submission',async()=>{
  const sample=await setup(false);try{
    const original=sample.connection.prepare('SELECT * FROM attempts').all();await migrate(sample.database);
    assert.deepEqual(sample.connection.prepare('SELECT * FROM attempts').all(),original);
    let view=await sample.progress.read();assert.equal(view.history[0].score,33);assert.equal(view.topics[0].priority,true);
    await sample.progress.flag('original','original-1',true);await sample.progress.flag('original','original-2',true);
    view=await createProgressRepository(sample.database).read();assert.equal(view.history[0].score,100);assert.equal(view.history[0].scorable,1);assert.equal(view.history[0].excluded,2);assert.equal(view.topics[0].limited,true);
    assert.deepEqual(await sample.quizzes.submit('original'),sample.submitted);
    await sample.progress.flag('original','original-0',true);assert.equal((await sample.progress.read()).history[0].score,null);
    await sample.progress.flag('original','original-1',false);assert.equal((await sample.progress.read()).history[0].score,0);
    await assert.rejects(sample.progress.flag('original','foreign',true));
    assert.deepEqual(sample.connection.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{sample.connection.close();}
});
test('repeat creates atomic saved snapshots and editable attempt, inherits exclusions, resumes and grades idempotently',async()=>{
  const sample=await setup();try{
    await sample.progress.flag('original','original-1',true);
    await sample.progress.repeat('parent','retry','second');await sample.progress.repeat('parent','retry','ignored');
    const detail=await sample.quizzes.detail('retry');assert.equal(detail.attempt.id,'second');assert.equal(detail.attempt.status,'in_progress');assert.equal(detail.responses[0].excluded,1);
    assert.deepEqual(detail.items.map(row=>row.item_json),(await sample.quizzes.detail('parent')).items.map(row=>row.item_json));
    assert.equal((await sample.progress.read()).history.find(attempt=>attempt.row.attempt_id==='second').scorable,0);
    await assert.rejects(sample.progress.flag('second','retry:0',true));
    await sample.quizzes.select('second','retry:0',1);await sample.quizzes.select('second','retry:0',0);await sample.quizzes.select('second','retry:2',0);
    const grade=await sample.quizzes.submit('second');assert.equal(grade.score,100);assert.equal(grade.scorable_count,2);assert.deepEqual(await sample.quizzes.submit('second'),grade);
    const view=await sample.progress.read();assert.equal(view.history.find(attempt=>attempt.row.attempt_id==='second').repeats,3);
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM attempts').get().count,2);
    assert.equal((await sample.quizzes.detail('parent')).attempt.score,33);
    assert.deepEqual(sample.connection.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{sample.connection.close();}
});
test('failed repeat and failed migration roll back; invalid/missing saved questions are not guessed',async()=>{
  const sample=await setup(false);try{
    await assert.rejects(migrate(sample.database,[...prior,{version:6,async apply(database){await progressMigration.apply(database);throw new Error('forced');}}]));
    assert.equal(sample.connection.prepare('SELECT max(version) AS version FROM schema_migrations').get().version,5);
    assert.equal(sample.connection.prepare("SELECT count(*) AS count FROM sqlite_master WHERE name='progress_flags'").get().count,0);
    await migrate(sample.database);
    sample.connection.exec("CREATE TRIGGER fail_repeat BEFORE INSERT ON quiz_items WHEN NEW.quiz_id='broken' BEGIN SELECT RAISE(ABORT,'forced'); END");
    await assert.rejects(sample.progress.repeat('parent','broken','broken-attempt'));
    assert.equal(sample.connection.prepare("SELECT count(*) AS count FROM quizzes WHERE id='broken'").get().count,0);
    assert.equal(sample.connection.prepare('SELECT count(*) AS count FROM quiz_repeats').get().count,0);
    await assert.rejects(sample.progress.repeat('missing','none','none'));
  }finally{sample.connection.close();}
});
