/* Pure question bank and session model; no network or browser dependencies. */
const PracticeEngine = (() => {
  const types = {mix:'Tổng hợp',mcq:'Trắc nghiệm từ vựng',cloze:'Điền từ / đục lỗ',grammar:'Ngữ pháp',order:'Sắp xếp câu',listening:'Nghe hiểu'};
  const norm = text => String(text).normalize('NFC').trim().toLowerCase().replace(/[\s'’。.!！?？,，;；]+/gu,'');
  function shuffle(items, random = Math.random) {
    const a = [...items];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function seeded(key){let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function buildBank(vocab, content, audio){
    const words = new Map(), bank=[];
    Object.entries(vocab).forEach(([lesson,rows])=>rows.forEach(([hz,py,vi])=>{
      if(!words.has(hz))words.set(hz,{hz,py:content.pinyin[hz]||py,vi:content.meanings[hz]||vi,lesson:+lesson});
    }));
    function add(q){
      if(q.options && (q.options.length!==4 || new Set(q.options.map(norm)).size!==4 || !q.options.includes(q.correct)))throw Error('Invalid choices: '+q.id);
      if(q.audioText && !audio[q.audioText])throw Error('Missing audio: '+q.id);
      bank.push(Object.freeze(q));
    }
    for(const group of content.groups){
      for(const hz of group){
        const w=words.get(hz);if(!w)throw Error('Missing word '+hz);
        const candidates=group.map(x=>words.get(x)).filter(x=>x&&x.hz!==hz&&norm(x.vi)!==norm(w.vi)&&norm(x.py)!==norm(w.py)&&!content.nearMeanings.some(g=>g.includes(hz)&&g.includes(x.hz)));
        const distractors=[];
        for(const d of shuffle(candidates,seeded(hz))){if(!distractors.some(x=>norm(x.vi)===norm(d.vi)))distractors.push(d);if(distractors.length===3)break;}
        if(distractors.length<3)continue;
        const base={family:'word-'+hz,lesson:w.lesson,format:'choice',explanation:`${hz} (${w.py}): ${w.vi}.`,answerText:`${hz} · ${w.py} · ${w.vi}`};
        add({...base,id:'meaning-'+hz,type:'mcq',prompt:'Chọn nghĩa đúng của từ.',stem:hz,options:[w.vi,...distractors.map(x=>x.vi)],correct:w.vi});
        add({...base,id:'hanzi-'+hz,type:'mcq',prompt:'Chọn từ tiếng Trung đúng với nghĩa.',stem:w.vi,options:[hz,...distractors.map(x=>x.hz)],correct:hz});
        if(!content.noWordListening.includes(hz)){
          add({...base,id:'hear-hanzi-'+hz,type:'listening',prompt:'Nghe và chọn từ bạn nghe được.',stem:'',audioText:hz,transcript:hz,translation:w.vi,options:[hz,...distractors.map(x=>x.hz)],correct:hz});
          add({...base,id:'hear-meaning-'+hz,type:'listening',prompt:'Nghe và chọn nghĩa của từ.',stem:'',audioText:hz,transcript:hz,translation:w.vi,options:[w.vi,...distractors.map(x=>x.vi)],correct:w.vi});
        }
      }
    }
    content.cloze.forEach(([lesson,stem,target,translation,distractors,explanation,chunks],i)=>{
      const word=words.get(target);if(!word)throw Error('Missing cloze target '+target);
      const base={family:'context-'+i,lesson,type:'cloze',stem,translation,correct:target,answerText:target+' · '+word.py,explanation,completed:stem.replace('___',target)};
      add({...base,id:'cloze-choice-'+i,format:'choice',prompt:'Chọn từ điền vào chỗ trống theo nghĩa câu.',options:[target,...distractors]});
      add({...base,id:'cloze-input-'+i,format:'input',prompt:'Điền đúng từ của bài theo nghĩa câu (chữ Hán hoặc pinyin có dấu thanh).',accepted:[target,word.py,...(content.pinyinAlternatives[target]||[])],hint:content.meanings[target]||word.vi});
      if(chunks)add({id:'order-'+i,family:'context-'+i,lesson,type:'order',format:'order',prompt:'Ghép các cụm thành câu, bắt đầu bằng «'+chunks[0]+'».',stem:'',chunks,correct:chunks.join(''),accepted:[chunks.join(''),...(content.orderAlternatives[i]||[])],answerText:chunks.join('')+'。',explanation:'Một thứ tự đúng: '+chunks.join(' → ')+'.'});
    });
    content.grammar.forEach(([lesson,stem,options,prompt,explanation],i)=>add({id:'grammar-'+i,family:'grammar-'+i,lesson,type:'grammar',format:'choice',stem,options,prompt,correct:options[0],answerText:stem.replace('___',options[0]),explanation}));
    content.listening.forEach(([lesson,transcript,translation,prompt,options,explanation],i)=>add({id:'dialogue-'+i,family:'dialogue-'+i,lesson,type:'listening',format:'choice',stem:'',audioText:transcript,transcript,translation,prompt,options,correct:options[0],answerText:options[0],explanation}));
    if(new Set(bank.map(q=>q.id)).size!==bank.length)throw Error('Duplicate IDs');
    return bank;
  }
  function createStore(bank, storage, random=Math.random){
    const key='hsk3clone_practice_v1', byId=new Map(bank.map(q=>[q.id,q]));
    const fresh=()=>({version:1,total:0,correct:0,seen:[],history:[],session:null});
    let state=fresh(),storageOK=true;
    try{
      const saved=JSON.parse(storage.getItem(key)||'null');
      if(saved&&saved.version===1&&Number.isInteger(saved.total)&&saved.total>=0&&Number.isInteger(saved.correct)&&saved.correct>=0&&saved.correct<=saved.total&&Array.isArray(saved.seen)&&Array.isArray(saved.history)){
        state=saved;state.seen=state.seen.filter(id=>byId.has(id));state.history=state.history.slice(-20);
        const s=state.session;
        if(s&&(!Array.isArray(s.items)||!s.items.length||typeof s.finished!=='boolean'||!Number.isInteger(s.index)||s.index<0||s.index>=s.items.length||s.items.some(item=>!item||!byId.has(item.id)||!Array.isArray(item.order)||!Array.isArray(item.draft)||typeof item.input!=='string'||typeof item.heard!=='boolean'||item.draft.some(i=>!Number.isInteger(i)||i<0||i>=item.order.length)||new Set(item.draft).size!==item.draft.length||(item.result!==null&&(typeof item.result?.correct!=='boolean'||typeof item.result?.answer!=='string')))))state.session=null;
        if(state.session){for(const [i,item] of state.session.items.entries()){const q=byId.get(item.id),expected=q.options||q.chunks||[];if(item.order.length!==expected.length||[...item.order].sort().join('\0')!==[...expected].sort().join('\0')||((i<state.session.index||state.session.finished)&&!item.result)){state.session=null;break;}}}
      }
    }catch{state=fresh();storageOK=false;}
    function save(){try{storage.setItem(key,JSON.stringify(state));storageOK=true;}catch{storageOK=false;}}
    const pool=filter=>bank.filter(q=>(!filter.lesson||q.lesson===+filter.lesson)&&(filter.type==='mix'||q.type===filter.type)&&(filter.listening!=='passage'||q.id.startsWith('dialogue-')||filter.type!=='listening'));
    function start(filter, ids){
      let selected;
      if(ids){selected=ids.map(id=>byId.get(id)).filter(Boolean);}
      else{
        const available=pool(filter), unseen=new Set(state.seen), usedFamilies=new Set();
        let ranked=[...shuffle(available.filter(q=>!unseen.has(q.id)),random),...shuffle(available.filter(q=>unseen.has(q.id)),random)];
        if(filter.type==='mix'){
          // Round-robin skill queues prevent the large vocabulary bank crowding out grammar and cloze.
          const queues=shuffle(Object.keys(types).filter(t=>t!=='mix'),random).map(t=>ranked.filter(q=>q.type===t));
          ranked=[];while(queues.some(q=>q.length))for(const queue of queues)if(queue.length)ranked.push(queue.shift());
        }
        selected=[];
        for(const q of ranked){if(!usedFamilies.has(q.family)){selected.push(q);usedFamilies.add(q.family);}if(selected.length>=filter.count)break;}
      }
      if(!selected.length)return null;
      state.session={filter:{...filter},index:0,finished:false,items:selected.map(q=>({id:q.id,order:shuffle(q.options||q.chunks||[],random),draft:[],input:'',heard:false,result:null}))};save();return state.session;
    }
    function current(){const s=state.session;return s?{item:s.items[s.index],question:byId.get(s.items[s.index].id)}:null;}
    function grade(answer){
      const s=state.session, c=current();if(!c||s.finished||c.item.result||(c.question.audioText&&!c.item.heard))return null;
      if(typeof answer!=='string'||!norm(answer))return null;
      const q=c.question; const accepted=q.accepted||[q.correct];
      const correct=accepted.some(x=>norm(x)===norm(answer));
      c.item.result={answer:String(answer),correct};state.total++;if(correct)state.correct++;
      if(!state.seen.includes(q.id))state.seen.push(q.id);save();return c.item.result;
    }
    function next(){const s=state.session;if(!s||!current().item.result)return false;if(s.index<s.items.length-1)s.index++;else if(!s.finished){s.finished=true;state.history.push({at:Date.now(),correct:s.items.filter(i=>i.result?.correct).length,total:s.items.length});state.history=state.history.slice(-20);}save();return true;}
    return {pool,start,current,grade,next,save,get state(){return state;},get storageOK(){return storageOK;},getQuestion:id=>byId.get(id),retake(wrongOnly=false){const s=state.session;if(!s)return null;return start(s.filter,s.items.filter(i=>!wrongOnly||i.result&&!i.result.correct).map(i=>i.id));},clear(){state=fresh();save();},stats(){return{correct:state.correct,total:state.total};}};
  }
  return {types,norm,shuffle,buildBank,createStore};
})();
