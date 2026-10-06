import assert from 'node:assert/strict';
import { test } from 'node:test';
import { notebookScrollTarget, safeGenerationError, wideNotebook } from '../src/domain/experience.ts';

test('notebook carousel arrows advance the viewport and clamp at both ends', () => {
  assert.equal(notebookScrollTarget(0, 1, 300, 1000), 240);
  assert.equal(notebookScrollTarget(600, 1, 300, 1000), 700);
  assert.equal(notebookScrollTarget(100, -1, 300, 1000), 0);
  assert.equal(notebookScrollTarget(500, -1, 300, 1000), 260);
  assert.equal(notebookScrollTarget(0, 1, 300, 200), 0);
  assert.equal(notebookScrollTarget(0, 1, 300, 0), 0);
});

test('phone and large text stay single-column; wide regular-text screens gain history panel',()=>{
  assert.equal(wideNotebook(390,1),false);
  assert.equal(wideNotebook(999,1),false);
  assert.equal(wideNotebook(1000,1),true);
  assert.equal(wideNotebook(1200,1.5),false);
  assert.equal(wideNotebook(1200,2),false);
});
test('generation diagnostics never surface arbitrary native/model content',()=>{
  const raw=new Error('SECRET notes and file:///private/notes');
  assert.ok(!safeGenerationError(raw).includes('SECRET'));
  assert.ok(!safeGenerationError(raw).includes('file:'));
  const known='Set up and verify the teacher in Settings first.';
  assert.equal(safeGenerationError(new Error(known)),known);
  assert.ok(!safeGenerationError(new Error(`${known} SECRET`)).includes('SECRET'));
});
test('shared text/action/status palette meets normal-text WCAG 4.5 contrast',()=>{
  function luminance(hex){
    const components=hex.match(/[a-f0-9]{2}/gi).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return components[0]*0.2126+components[1]*0.7152+components[2]*0.0722;
  }
  for(const [foreground,background] of [['243b39','fcf8f0'],['4c5e5c','fffcf7'],['ffffff','086c70'],['9b2929','fffcf7'],['225f41','e0efdb'],['4c5e5c','ffedc4']]){
    const values=[luminance(foreground),luminance(background)].sort((left,right)=>left-right);
    assert.ok((values[1]+0.05)/(values[0]+0.05)>=4.5,`${foreground}/${background}`);
  }
});
