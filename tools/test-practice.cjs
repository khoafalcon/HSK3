/* Run: node tools/test-practice.cjs. No test dependencies. */
const assert=require('node:assert/strict'), fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
for(const name of ['data','audio-map','practice-content','practice-engine'])vm.runInContext(fs.readFileSync(path.join(root,'assets/js',name+'.js'),'utf8'),context);
const {engine,content,bank,audio}=vm.runInContext('({engine:PracticeEngine,content:PRACTICE_CONTENT,bank:PracticeEngine.buildBank(VOCAB,PRACTICE_CONTENT,VOCAB_AUDIO),audio:VOCAB_AUDIO})',context);
assert.equal(bank.length,1096);
assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
for(let lesson=1;lesson<=20;lesson++)for(const type of Object.keys(engine.types).filter(t=>t!=='mix'))assert(bank.some(q=>q.lesson===lesson&&q.type===type),`Missing ${lesson}/${type}`);
assert.equal(content.cloze.length,80);assert.equal(content.grammar.length,40);assert.equal(content.listening.length,40);
for(const q of bank){
  assert(q.explanation.length>10);
  if(q.options){assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(engine.norm)).size,4);assert(q.options.includes(q.correct));}
  if(q.audioText){assert(fs.existsSync(path.join(root,audio[q.audioText])));assert(q.transcript);}
  if(q.type==='cloze'){assert.equal(q.stem.split('___').length,2);assert(q.translation);}
}
const memory=()=>({value:null,getItem(){return this.value;},setItem(key,value){this.value=value;}});
const storage=memory();let store=engine.createStore(bank,storage);
const filter={type:'mix',lesson:0,count:20,listening:'all'};
for(let trial=0;trial<50;trial++){
  const session=store.start(filter);
  assert.equal(session.items.length,20);
  assert.equal(new Set(session.items.map(i=>store.getQuestion(i.id).family)).size,20);
  assert.equal(new Set(session.items.map(i=>store.getQuestion(i.id).type)).size,5);
}
// Every answer key grades correctly; a checked answer is immutable and scored once.
store.start(filter,bank.map(q=>q.id));
for(const q of bank){
  assert.equal(store.current().question.id,q.id);
  if(q.audioText){assert.equal(store.grade(q.correct),null);store.current().item.heard=true;}
  assert.equal(store.grade(''),null);
  assert.equal(store.grade(q.correct).correct,true,q.id);
  assert.equal(store.grade('wrong'),null);assert(store.next());
}
assert.equal(store.stats().total,1096);assert.equal(store.stats().correct,1096);assert(store.state.session.finished);
assert.equal(store.state.history.length,1);
store.next();assert.equal(store.state.history.length,1);
// Retake clears drafts/results/listening state while retaining cumulative stats.
store.retake();assert.equal(store.state.session.items.length,1096);
assert(store.state.session.items.every(i=>!i.result&&!i.heard&&!i.draft.length));
assert.equal(store.stats().total,1096);
store.start(filter,['meaning-周末','cloze-input-0','dialogue-0']);
store.grade('incorrect');store.next();store.grade(' ZHŌU MÒ '.normalize('NFD'));store.next();
store.current().item.heard=true;store.grade(store.current().question.correct);store.next();
store.retake(true);assert.equal(store.state.session.items.length,1);assert.equal(store.current().question.id,'meaning-周末');
assert.equal(store.stats().total,1099);
// Reload restores an already graded item without counting it again.
store.grade(store.current().question.correct);const before=store.stats().total;
store=engine.createStore(bank,storage);assert(store.current().item.result.correct);assert.equal(store.grade('wrong'),null);assert.equal(store.stats().total,before);
store.next();store=engine.createStore(bank,storage);assert(store.state.session.finished);
// Fresh sets prefer unseen questions and honor lesson/listening filters.
store.clear();store.start({...filter,type:'mcq',lesson:1,count:10});
const first=store.state.session.items.map(i=>i.id);
while(!store.state.session.finished){assert.equal(store.current().question.lesson,1);store.grade(store.current().question.correct);store.next();}
store.start({...filter,type:'mcq',lesson:1,count:10});assert(store.state.session.items.every(i=>!first.includes(i.id)));
store.start({...filter,type:'listening',lesson:5,listening:'passage',count:50});assert.equal(store.state.session.items.length,2);assert(store.state.session.items.every(i=>i.id.startsWith('dialogue-')));
// Corrected pinyin and common typographic variants are accepted; tones remain required.
store.start(filter,['cloze-input-35']);assert.equal(store.grade('liǎo jiě').correct,true);
store.start(filter,['cloze-input-63']);assert.equal(store.grade("KĚ'ÀI").correct,true);
store.start(filter,['cloze-input-63']);assert.equal(store.grade('keai').correct,false);
store.start(filter,['order-12']);assert.equal(store.grade('爸爸给我用手机拍了一张照片。').correct,true);
// Bad storage and unavailable storage never prevent a new practice session.
storage.value='{bad JSON';store=engine.createStore(bank,storage);assert.equal(store.state.session,null);
storage.value=JSON.stringify({version:1,total:2,correct:1,seen:[],history:[],session:{items:[null],index:0,finished:true}});store=engine.createStore(bank,storage);assert.equal(store.state.session,null);
store=engine.createStore(bank,{getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});store.start(filter);assert.equal(store.storageOK,false);assert(store.current());
console.log(`PASS: ${bank.length} answer keys, 20 lessons, balanced random sets, audio manifest, single scoring, typed tones, alternative order, retake, wrong-only, reload and storage failure.`);
