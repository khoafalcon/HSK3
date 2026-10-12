/* Run: node tools/test-practice-ui.mjs /absolute/path/to/happy-dom/lib/index.js
   DOM-only test; does not access a live browser, network or real speakers. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {Window}=await import(pathToFileURL(path.resolve(process.argv[2])).href);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const standalone=process.argv[3]?fs.readFileSync(path.resolve(process.argv[3]),'utf8'):null;
function open(saved){
  const window=new Window({url:'https://practice.test',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
  window.confirm=()=>true;
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLMediaElement.prototype.pause=function(){this.pauseCalls=(this.pauseCalls||0)+1;};
  window.HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new window.Event('play'));return Promise.resolve();};
  const html=standalone||fs.readFileSync(path.join(root,'index.html'),'utf8');
  window.document.write(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  if(saved)window.localStorage.setItem('hsk3clone_practice_v1',saved);
  const code=standalone?[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n'):['data','audio-map','practice-content','practice-engine','app','practice-ui'].map(file=>fs.readFileSync(path.join(root,'assets/js',file+'.js'),'utf8')).join('\n');
  window.eval(code+'\nwindow.__practiceBank=PracticeEngine.buildBank(VOCAB,PRACTICE_CONTENT,VOCAB_AUDIO);');
  if(standalone){assert.equal(window.document.querySelectorAll('link[rel="stylesheet"]').length,0);assert.equal(window.document.querySelectorAll('style').length,2);assert.equal(window.getComputedStyle(window.document.querySelector('.icon-library')).width,'0px');assert.equal(window.getComputedStyle(window.document.querySelector('.icon')).width,'20px');}
  return window;
}
let w=open(),d=w.document;
const click=id=>{const e=d.getElementById(id);assert(e,'Missing '+id);assert(!e.disabled,'Disabled '+id);e.click();};
const state=()=>JSON.parse(w.localStorage.getItem('hsk3clone_practice_v1'));
const question=()=>w.__practiceBank.find(q=>q.id===state().session.items[state().session.index].id);
function choose(correct){const q=question(),s=state(),item=s.session.items[s.session.index];const value=correct?q.correct:q.options.find(o=>o!==q.correct);d.querySelector(`[data-option="${item.order.indexOf(value)}"]`).click();}
assert(d.getElementById('practice-bank-count').textContent.includes('1.096'));
click('tab-exercise');d.querySelector('[data-type="listening"]').click();
d.getElementById('practice-listening').value='passage';d.getElementById('practice-listening').dispatchEvent(new w.Event('change'));
click('practice-start');assert(d.getElementById('practice-check').disabled);
let q=question();assert(!d.getElementById('practice-root').textContent.includes(q.transcript));assert(!d.getElementById('practice-root').textContent.includes(q.translation));
choose(false);assert(d.getElementById('practice-check').disabled);
let player=d.getElementById('practice-audio');player.dispatchEvent(new w.Event('error'));assert(d.getElementById('practice-audio-status').textContent.includes('Chưa phát'));assert.equal(state().total,0);
click('practice-replay');player.dispatchEvent(new w.Event('ended'));assert(!d.getElementById('practice-check').disabled);
click('practice-check');assert.equal(state().total,1);assert(d.querySelector('.practice-transcript').textContent.includes(q.transcript));
// Reload same graded question, then finish one wrong and all other answers right.
const saved=w.localStorage.getItem('hsk3clone_practice_v1');w=open(saved);d=w.document;
click('tab-exercise');click('practice-resume');assert.equal(state().total,1);assert(!d.getElementById('practice-check'));click('practice-next');
while(!state().session.finished){choose(true);d.getElementById('practice-audio').dispatchEvent(new w.Event('ended'));click('practice-check');click('practice-next');}
const total=state().total;assert.equal(total,20);assert(d.getElementById('practice-wrong').textContent.includes('1 câu sai'));
click('practice-wrong');assert.equal(state().session.items.length,1);assert(!state().session.items[0].heard);assert(!d.querySelector('.practice-transcript'));
choose(true);d.getElementById('practice-audio').dispatchEvent(new w.Event('ended'));click('practice-check');click('practice-next');
assert(!d.getElementById('practice-wrong'));click('practice-retake');assert.equal(state().session.items.length,1);assert.equal(state().total,21);
// Pausing and tab changes stop audio; replay after returning is also stoppable.
player=d.getElementById('practice-audio');click('practice-replay');click('tab-vocab');assert(player.pauseCalls>0);
click('tab-exercise');click('practice-replay');const pauses=player.pauseCalls;click('tab-grammar');assert(player.pauseCalls>pauses);click('tab-exercise');
click('practice-pause');d.querySelector('[data-type="cloze"]').click();click('practice-start');
// Exercise both answer controls and Enter submission without leaking the solution.
for(let i=0;i<state().session.items.length;i++){
  q=question();if(q.format==='input'){const input=d.getElementById('practice-input');input.value=q.correct;input.dispatchEvent(new w.Event('input'));input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));}
  else {choose(true);click('practice-check');}
  assert(state().session.items[state().session.index].result.correct);click('practice-next');
}
click('practice-new');d.querySelector('[data-type="order"]').click();click('practice-start');q=question();
let item=state().session.items[0];for(const chunk of q.chunks)d.querySelector(`[data-chunk="${item.order.indexOf(chunk)}"]`).click();
assert(!d.getElementById('practice-check').disabled);d.querySelector('[data-remove]').click();assert(d.getElementById('practice-check').disabled);
click('practice-pause');click('practice-resume');assert.equal(d.querySelectorAll('[data-remove]').length,q.chunks.length-1);
click('tab-progress');assert(d.getElementById('stat-grid').textContent.includes('Bài tập chính xác'));click('reset-progress-btn');assert.equal(state().total,0);assert.equal(state().session,null);
assert.equal(d.querySelectorAll('#practice-root button[data-type]').length,6);
console.log('PASS: DOM flows for setup, hidden transcript, audio error/end/replay, scoring, resume, results, full/wrong-only retake, cloze input/Enter, order undo, tab audio stop and progress reset. Real rendering and speaker output are not tested.');
await w.happyDOM.close();
