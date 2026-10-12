const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
const mapSource = fs.readFileSync(path.join(root, 'assets/js/audio-map.js'), 'utf8');
const data = fs.readFileSync(path.join(root, 'assets/js/data.js'), 'utf8');
new vm.Script(source);
const { words, audioMap } = vm.runInNewContext(data + '\n' + mapSource + ';({words:Object.values(VOCAB).flat(),audioMap:VOCAB_AUDIO})');
for(const word of words){
  assert.ok(audioMap[word[0]], 'Missing audio: ' + word[0]);
  const bytes = fs.readFileSync(path.join(root, audioMap[word[0]]));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.ok(bytes.length > 6000, 'Empty or truncated clip');
}
const block = source.split('// ============================================================ PRONUNCIATION')[1]
  .split('// ============================================================ VOCAB TAB')[0];
function element(){
  const attrs = {'aria-label':'Nghe phát âm'};
  const label = {textContent:'Nghe phát âm'};
  const classes = new Set();
  return {hidden:true,dataset:{},label,attrs,paused:false,
    classList:{toggle(name,on){on ? classes.add(name) : classes.delete(name);}},
    setAttribute(name,value){attrs[name] = value;}, getAttribute(name){return attrs[name];},
    querySelector(){return label;}, addEventListener(){}, pause(){this.paused=true;}};
}
function harness(mode = 'ok', voices = []){
  const elements = Object.fromEntries(['speech-feedback','speech-fallback','speech-message','speech-dismiss'].map(id=>[id,element()]));
  const instances = [], timers = new Map(); let timerId = 0;
  class AudioDouble {
    constructor(src){this.src=src;this.paused=false;instances.push(this);}
    play(){return mode === 'blocked' ? Promise.reject(Object.assign(new Error('Blocked'),{name:'NotAllowedError'})) : Promise.resolve();}
    pause(){this.paused=true;}
  }
  const synthesis = {getVoices:()=>voices, cancel(){}, resume(){}, speak(utterance){this.last = utterance;}};
  const context = vm.createContext({
    document:{getElementById:id=>elements[id]},
    window:{addEventListener(){},speechSynthesis:synthesis,SpeechSynthesisUtterance:class{}},
    Audio:AudioDouble, SpeechSynthesisUtterance:class{}, VOCAB_AUDIO:audioMap,
    setTimeout(fn){const id=++timerId;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}
  });
  vm.runInContext(block,context);
  return {context,elements,instances,timers,synthesis};
}
(async()=>{
  const first = words[0][0], second = words[1][0];
  const h = harness(), b = element(), b2 = element();
  h.context.speak(first,b);
  assert.equal(h.instances[0].src,audioMap[first]);
  assert.equal(b.attrs['aria-busy'],'true');
  h.instances[0].onplaying();
  assert.equal(b.label.textContent,'Dừng nghe');
  assert.equal(b.attrs['aria-busy'],'false');
  assert.equal(h.timers.size,0);
  h.context.speak(first,b);
  assert.equal(h.instances[0].paused,true);
  assert.equal(b.attrs['aria-pressed'],'false');
  h.context.speak(first,b); const old = h.instances.at(-1);
  h.context.speak(second,b2); const current = h.instances.at(-1);
  assert.equal(old.paused,true);
  old.onerror(new Error('Late error')); old.onended();
  assert.equal(b2.attrs['aria-pressed'],'true');
  current.onplaying(); current.onended();
  assert.equal(b2.attrs['aria-pressed'],'false');
  assert.equal(h.elements['speech-feedback'].hidden,true);
  const blocked = harness('blocked'), blockedButton=element();
  blocked.context.speak(first,blockedButton); await Promise.resolve();
  assert.equal(blocked.elements['speech-feedback'].hidden,false);
  assert.equal(blocked.elements['speech-fallback'].src,audioMap[first]);
  assert.equal(blockedButton.attrs['aria-pressed'],'false');
  const missing = harness(); missing.context.speak('not-in-bundle',element());
  assert.equal(missing.elements['speech-feedback'].hidden,false);
  const voiced = harness('ok',[{lang:'zh-CN',name:'Test Mandarin'}]);
  const voicedButton = element(); voiced.context.speak('not-in-bundle',voicedButton);
  assert.equal(voiced.synthesis.last.lang,'zh-CN');
  voiced.synthesis.last.onstart(); assert.equal(voicedButton.label.textContent,'Dừng nghe');
  voiced.synthesis.last.onend(); assert.equal(voicedButton.attrs['aria-pressed'],'false');
  const stalled = harness(); stalled.context.speak(first,element());
  Array.from(stalled.timers.values())[0]();
  assert.equal(stalled.elements['speech-feedback'].hidden,false);
  const failed = harness(), failedButton = element(); failed.context.speak(first,failedButton);
  failed.instances[0].onerror(new Error('File missing'));
  assert.equal(failed.elements['speech-feedback'].hidden,false);
  assert.equal(failedButton.attrs['aria-pressed'],'false');
  console.log(`PASS: ${words.length} vocabulary entries, ${Object.keys(audioMap).length} valid audio files; playback, stop, rapid switching, stale callbacks, blocked playback, missing voices, speech fallback and timeout handling.`);
  console.log('Tests use mocked media APIs; actual browser audio output still needs a listening check.');
})().catch(error=>{console.error(error);process.exitCode=1;});
