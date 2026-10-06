import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/db/migrate.ts';
import { createStorageRepository, ownedFile } from '../src/adapters/sqlite/storage.ts';
import { initializeFoundation } from '../src/services/foundation.ts';
import { cleanupMigration } from '../src/db/migrations/007-cleanup.ts';
import { foundationMigration } from '../src/db/migrations/001-foundation.ts';
import { modelMigration } from '../src/db/migrations/002-model-installations.ts';
import { importsMigration } from '../src/db/migrations/003-imports.ts';
import { studyMigration } from '../src/db/migrations/004-study.ts';
import { quizMigration } from '../src/db/migrations/005-quizzes.ts';
import { progressMigration } from '../src/db/migrations/006-progress.ts';
const prior = [foundationMigration,modelMigration,importsMigration,studyMigration,quizMigration,progressMigration];
async function setup(upgrade = true) {
  const connection = new DatabaseSync(':memory:');
  const database = {
    async execAsync(sql) { connection.exec(sql); },
    async runAsync(sql,...params) { return connection.prepare(sql).run(...params); },
    async getFirstAsync(sql,...params) { return connection.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql,...params) { return connection.prepare(sql).all(...params); },
    async withExclusiveTransactionAsync(work) {
      connection.exec('BEGIN IMMEDIATE');
      try { await work(database); connection.exec('COMMIT'); }
      catch (error) { connection.exec('ROLLBACK'); throw error; }
    },
  };
  await migrate(database,prior);
  connection.exec(`INSERT INTO notebooks VALUES ('keep','Other','now'); INSERT INTO notebooks VALUES ('target','Remove','now');
    INSERT INTO profile VALUES ('profile',1,'Keep profile','en','now','now');`);
  for (const id of ['one','two']) {
    await database.runAsync(`INSERT INTO documents(id,notebook_id,title,kind,original_name,status,created_at) VALUES (?,'target',?,'txt',?,'ready','now')`,id,id,`source-${id}.txt`);
    await database.runAsync("INSERT INTO document_revisions VALUES (?,?,'test','now')",`rev-${id}`,id);
    await database.runAsync("INSERT INTO pages VALUES (?,?,1,'Plants use sunlight.','Plants use sunlight.','text',NULL)",`page-${id}`,`rev-${id}`);
    await database.runAsync("INSERT INTO chunks VALUES (?,?,0,'Plants use sunlight.',0,20,5)",`chunk-${id}`,`page-${id}`);
    await database.runAsync("INSERT INTO chunk_search VALUES (?,?,'Plants use sunlight.')",`chunk-${id}`,id);
    await database.runAsync('UPDATE documents SET active_revision_id=? WHERE id=?',`rev-${id}`,id);
    const evidence=JSON.stringify([{documentId:id,revisionId:`rev-${id}`,text:'Synthetic only'}]);
    await database.runAsync("INSERT INTO study_turns VALUES (?,'target','ask','Synthetic?','complete',?,NULL,'section','test','test',1,NULL,'now','now')",`turn-${id}`,evidence);
    await database.runAsync("INSERT INTO quizzes VALUES (?,'target',3,'ready',?,'test','test',NULL,'now')",`quiz-${id}`,evidence);
    await database.runAsync("INSERT INTO attempts VALUES (?,?,'in_progress',NULL,NULL,NULL,'now',NULL)",`attempt-${id}`,`quiz-${id}`);
    await database.runAsync("INSERT INTO quiz_items VALUES (?,?,0,'{}')",`item-${id}`,`quiz-${id}`);
    await database.runAsync('INSERT INTO responses VALUES (?,?,0,0,1,1)',`attempt-${id}`,`item-${id}`);
    await database.runAsync('INSERT INTO progress_flags VALUES (?,?,1,?)',`attempt-${id}`,`item-${id}`,'now');
  }
  if(upgrade) await migrate(database);
  return {connection,database,storage:createStorageRepository(database)};
}
const source={kind:'source',id:'one'};
test('source deletion is confirmed, isolated, transactional and clears FTS/derived evidence',async()=>{
  const sample=await setup();try{
    const preview=await sample.storage.preview(source);
    assert.equal(preview.sources,1);assert.equal(preview.quizzes,1);assert.equal(preview.attempts,1);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM documents')).length,2);
    await assert.rejects(sample.storage.remove(source,'not confirmed'));
    await sample.storage.remove(source,preview.token);
    for(const table of ['documents','pages','chunks','chunk_search','document_revisions','study_turns','quizzes','attempts','quiz_items','responses','progress_flags']) assert.equal((await sample.database.getAllAsync(`SELECT * FROM ${table}`)).length,1,table);
    assert.equal((await sample.storage.pending()).length,12);
    assert.deepEqual(await sample.database.getAllAsync('PRAGMA foreign_key_check'),[]);
    assert.equal((await sample.database.getFirstAsync('SELECT display_name FROM profile')).display_name,'Keep profile');
    assert.ok(await sample.database.getFirstAsync("SELECT * FROM notebooks WHERE id='keep'"));
  }finally{sample.connection.close();}
});
test('changed selection and active work reject deletion; failed transaction rolls back queue and index',async()=>{
  const sample=await setup();try{
    const preview=await sample.storage.preview(source);
    await sample.database.runAsync("UPDATE documents SET title='New' WHERE id='one'");
    await assert.rejects(sample.storage.remove(source,preview.token),/CHANGED/);
    await sample.database.runAsync("UPDATE study_turns SET status='generating' WHERE id='turn-one'");
    await assert.rejects(sample.storage.preview(source),/BUSY/);
    await sample.database.runAsync("UPDATE study_turns SET status='complete' WHERE id='turn-one'");
    await sample.database.execAsync("CREATE TRIGGER fail_delete BEFORE DELETE ON documents BEGIN SELECT RAISE(ABORT,'injected'); END;");
    await assert.rejects(sample.storage.remove(source,(await sample.storage.preview(source)).token),/injected/);
    assert.equal((await sample.storage.pending()).length,0);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM chunk_search')).length,2);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM attempts')).length,2);
  }finally{sample.connection.close();}
});
test('notebook deletion includes mixed evidence, repeats, duplicates, drafts and all history',async()=>{
  const sample=await setup();try{
    await sample.database.runAsync("INSERT INTO quiz_repeats VALUES ('quiz-two','quiz-one')");
    await sample.database.runAsync("INSERT INTO documents(id,notebook_id,title,kind,original_name,status,duplicate_of,created_at) VALUES ('duplicate','target','Duplicate','txt','source-duplicate.txt','duplicate','one','now')");
    await sample.database.runAsync("INSERT INTO import_jobs VALUES ('job','duplicate','draft','duplicate',NULL,'now')");
    await sample.database.runAsync("INSERT INTO import_pages VALUES ('job',1,'Text','Text','text','source-duplicate.txt-p1.jpg')");
    const preview=await sample.storage.preview(source);assert.equal(preview.sources,2);assert.equal(preview.quizzes,2);
    const target={kind:'notebook',id:'target'};
    await sample.storage.remove(target,(await sample.storage.preview(target)).token);
    for(const table of ['documents','chunks','chunk_search','quizzes','attempts','study_turns','quiz_repeats','import_jobs','import_pages']) assert.equal((await sample.database.getAllAsync(`SELECT * FROM ${table}`)).length,0,table);
    assert.deepEqual(await sample.database.getAllAsync('PRAGMA foreign_key_check'),[]);
    assert.ok(await sample.database.getFirstAsync("SELECT * FROM notebooks WHERE id='keep'"));
  }finally{sample.connection.close();}
});
test('cleanup is retryable across reopen, missing files are idempotent, errors contain no content',async()=>{
  const sample=await setup();try{
    await sample.storage.remove(source,(await sample.storage.preview(source)).token);
    const files=new Set(['source-one.txt','source-one.txt-p1.jpg']);
    await sample.storage.cleanup(async name=>{if(name==='source-one.txt')throw new Error('SECRET raw path');files.delete(name);});
    const pending=await sample.storage.pending();assert.equal(pending.length,1);assert.equal(pending[0].error_code,'CLEANUP_FAILED');assert.equal(pending[0].attempts,1);
    const reopened=await initializeFoundation(sample.database);
    await reopened.storage.cleanup(async name=>{files.delete(name);});
    assert.equal((await reopened.storage.pending()).length,0);assert.equal(files.size,0);
    await reopened.storage.cleanup(async()=>assert.fail('No repeated cleanup'));
  }finally{sample.connection.close();}
});
test('malformed evidence and unsafe file names fail closed without losing study data',async()=>{
  const sample=await setup();try{
    await sample.database.runAsync("UPDATE study_turns SET evidence_json='null' WHERE id='turn-one'");
    await assert.rejects(sample.storage.preview(source),/INVALID_HISTORY/);
    const target={kind:'notebook',id:'target'};
    await sample.database.runAsync("UPDATE documents SET original_name='../keep.txt' WHERE id='one'");
    await assert.rejects(sample.storage.remove(target,(await sample.storage.preview(target)).token),/INVALID_FILE/);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM documents')).length,2);
    for(const name of ['../secret','/secret','file:///private/a','a/b','a\\b','..',''])assert.equal(ownedFile(name),false);
  }finally{sample.connection.close();}
});
test('model removal is separate, verifies confirmed identity and preserves source/attempt rows',async()=>{
  const sample=await setup();try{
    await sample.database.runAsync("INSERT INTO model_installations VALUES ('model','rev','hash',123,'license','runtime','model-test.gguf','download-test.partial',123,'ready','now')");
    await assert.rejects(sample.storage.removeModel('model','other.gguf',null),/CHANGED/);
    await sample.storage.removeModel('model','model-test.gguf','download-test.partial');
    assert.equal((await sample.storage.pending()).length,2);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM documents')).length,2);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM attempts')).length,2);
    assert.equal((await sample.database.getAllAsync('SELECT * FROM model_installations')).length,0);
  }finally{sample.connection.close();}
});
test('migration 7 preserves T6 data and failed migration rolls back without reset',async()=>{
  const sample=await setup(false);try{
    const original=await sample.database.getAllAsync('SELECT * FROM attempts');
    await assert.rejects(migrate(sample.database,[...prior,{version:7,async apply(database){await cleanupMigration.apply(database);throw new Error('injected');}}]));
    assert.equal((await sample.database.getFirstAsync('SELECT max(version) AS version FROM schema_migrations')).version,6);
    await migrate(sample.database);
    assert.deepEqual(await sample.database.getAllAsync('SELECT * FROM attempts'),original);
    assert.deepEqual(await sample.database.getAllAsync('PRAGMA foreign_key_check'),[]);
  }finally{sample.connection.close();}
});
