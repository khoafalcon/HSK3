/* Local practice UI: answers and transcripts are revealed only after grading. */
const Practice = (() => {
  const bank=PracticeEngine.buildBank(VOCAB,PRACTICE_CONTENT,VOCAB_AUDIO);
  const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
  const store=PracticeEngine.createStore(bank,storage);
  const root=document.getElementById('practice-root');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let filter={type:'mix',lesson:0,count:20,listening:'all'}, audio=null;
  const $=id=>document.getElementById(id);
  const button=(id,text,primary=false)=>`<button type="button" id="${id}" class="btn ${primary?'btn-seal':''}">${text}</button>`;
  function stopAudio(){if(audio){audio.pause();audio=null;}}
  function focusTitle(){root.querySelector('[data-practice-title]')?.focus({preventScroll:true});}
  function warning(){return `<p id="practice-storage" class="practice-warning" role="status" ${store.storageOK?'hidden':''}>Trình duyệt không lưu được tiến độ. Bạn vẫn có thể luyện trong phiên này; tải lại trang sẽ mất kết quả mới.</p>`;}
  function storageNotice(){const el=$('practice-storage');if(el)el.hidden=store.storageOK;}
  function persist(){store.save();storageNotice();}
  function countAvailable(){return new Set(store.pool(filter).map(q=>q.family)).size;}
  function setup(focus=false){
    stopAudio();const s=store.state.session;
    $('practice-bank-count').textContent=bank.length.toLocaleString('vi-VN')+' câu / dạng luyện';
    root.innerHTML=`<div class="practice-setup glass">
      <h3 tabindex="-1" data-practice-title>Hôm nay bạn muốn luyện gì?</h3>
      <p class="practice-muted">Tạo bộ mới từ câu chưa làm. Mỗi bộ tránh lặp cùng một từ hoặc ngữ cảnh.</p>
      <div class="practice-types" role="group" aria-label="Dạng luyện">${Object.entries(PracticeEngine.types).map(([type,label])=>`<button class="practice-type" data-type="${type}" aria-pressed="${filter.type===type}">${label}</button>`).join('')}</div>
      <div class="practice-fields"><label>Bài học<select id="practice-lesson"><option value="0">Tất cả 20 bài</option>${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${filter.lesson===i+1?'selected':''}>Bài ${i+1}</option>`).join('')}</select></label>
      <label>Độ dài bộ luyện<select id="practice-length">${[10,20,30,50].map(n=>`<option value="${n}" ${filter.count===n?'selected':''}>${n} câu</option>`).join('')}</select></label>
      ${filter.type==='listening'?`<label>Nội dung nghe<select id="practice-listening"><option value="all">Từ vựng + đoạn ngắn</option><option value="passage" ${filter.listening==='passage'?'selected':''}>Chỉ đoạn nghe hiểu</option></select></label>`:''}</div>
      <p id="practice-availability" class="practice-muted"></p>
      <div class="practice-actions">${button('practice-start','Bắt đầu luyện',true)}${s?button('practice-resume',s.finished?'Xem kết quả vừa làm':`Tiếp tục câu ${s.index+1}/${s.items.length}`):''}</div>
      ${warning()}
      <details class="practice-about"><summary>Bộ bài được xây dựng như thế nào?</summary><p>${PRACTICE_CONTENT.cloze.length} ngữ cảnh điền từ, ${PRACTICE_CONTENT.grammar.length} câu ngữ pháp và ${PRACTICE_CONTENT.listening.length} đoạn nghe được soạn riêng. Từ vựng được luyện theo nhiều hướng: nhận diện chữ, nghĩa và âm thanh. Con số ${bank.length.toLocaleString('vi-VN')} tính các hướng luyện này; đổi thứ tự đáp án không được tính là câu mới.</p><p>Mỗi câu có đáp án và giải thích. Bài tự nhập dùng đúng từ được gợi ý, chấp nhận chữ Hán hoặc pinyin có dấu thanh. Âm thanh tổng hợp Mandarin được lưu sẵn để nghe offline; đây là bộ luyện bổ trợ, không phải đề thi HSK chính thức.</p></details>
      ${store.state.history.length?`<div class="practice-history"><h4>Những lần luyện gần đây</h4>${store.state.history.slice(-5).reverse().map(h=>`<span>${esc(new Date(h.at).toLocaleDateString('vi-VN'))} · ${h.correct}/${h.total} câu đúng</span>`).join('')}</div>`:''}
    </div>`;
    const updateCount=()=>{const n=countAvailable();$('practice-availability').textContent=`${n} từ / ngữ cảnh phù hợp · Bộ này gồm ${Math.min(n,filter.count)} câu. ${n<filter.count?'Đã giới hạn theo nội dung hiện có của lựa chọn này.':''}`;$('practice-start').disabled=!n;};updateCount();
    root.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{filter.type=b.dataset.type;setup();root.querySelector(`[data-type="${filter.type}"]`).focus();});
    $('practice-lesson').onchange=e=>{filter.lesson=+e.target.value;updateCount();};
    $('practice-length').onchange=e=>{filter.count=+e.target.value;updateCount();};
    if($('practice-listening'))$('practice-listening').onchange=e=>{filter.listening=e.target.value;updateCount();};
    $('practice-start').onclick=()=>{if(s&&!s.finished&&!confirm('Tạo bộ mới sẽ thay phiên đang làm. Các câu đã chấm vẫn được lưu trong thống kê. Tiếp tục?'))return;store.start(filter);showQuestion();};
    if(s)$('practice-resume').onclick=()=>s.finished?results():showQuestion();
    if(focus)focusTitle();
  }
  function feedback(q,item){
    if(!item.result)return '';
    return `<div class="practice-feedback ${item.result.correct?'is-correct':'is-wrong'}" role="status"><strong>${item.result.correct?'Đúng rồi!':'Chưa đúng — cùng xem lại nhé.'}</strong><p>Đáp án: <b>${esc(q.answerText)}</b></p>${q.completed?`<p lang="zh-Hans">${esc(q.completed)}</p>`:''}<p>${esc(q.explanation)}</p>${q.transcript?`<div class="practice-transcript"><b>Lời thoại</b><p lang="zh-Hans">${esc(q.transcript)}</p><p>${esc(q.translation)}</p></div>`:''}</div>`;
  }
  function showQuestion(){
    stopAudio();stopSpeech();hideSpeechFeedback();
    const s=store.state.session;if(!s)return setup(true);if(s.finished)return results();
    const {question:q,item}=store.current(), graded=!!item.result;
    root.innerHTML=`<div class="practice-session-bar"><span>Câu ${s.index+1} / ${s.items.length}</span>${button('practice-pause','Lưu & đổi bộ')}</div>
      <progress class="practice-progress" value="${s.items.filter(i=>i.result).length}" max="${s.items.length}" aria-label="Số câu đã chấm"></progress>
      <div class="practice-question glass"><div class="practice-meta"><span>${esc(PracticeEngine.types[q.type])}</span><span>Bài ${q.lesson}</span></div>
      <h3 tabindex="-1" data-practice-title>${esc(q.prompt)}</h3>
      ${q.audioText?`<div class="practice-audio"><audio id="practice-audio" controls preload="none" aria-label="Âm thanh câu hỏi" src="${esc(VOCAB_AUDIO[q.audioText])}"></audio><div class="practice-audio-tools">${button('practice-replay','Nghe lại')}<label>Tốc độ <select id="practice-speed"><option value="1">1×</option><option value="0.8">0.8× · chậm</option></select></label></div><p id="practice-audio-status" role="status">${item.heard?'Đã nghe xong. Bạn có thể nghe lại tùy ý.':'Bấm phát và nghe hết một lần để mở nút chấm.'}</p></div>`:''}
      ${q.stem?`<p class="practice-stem" ${/[\u3400-\u9fff]/u.test(q.stem)?'lang="zh-Hans"':''}>${esc(q.stem).replace('___','<span class="practice-blank" aria-label="chỗ trống">　?　</span>')}</p>`:''}
      ${q.type==='cloze'?`<p class="practice-translation">${esc(q.translation)}</p>`:''}
      <div id="practice-response">${q.format==='choice'?`<div class="practice-options" role="group" aria-label="Chọn một đáp án">${item.order.map((o,i)=>`<button class="practice-option ${graded&&o===q.correct?'correct':''} ${graded&&!item.result.correct&&item.draft[0]===i?'incorrect':''}" data-option="${i}" aria-pressed="${item.draft[0]===i}" ${graded?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div>`:q.format==='input'?`<label class="practice-input-label" for="practice-input">Từ cần điền: ${esc(q.hint)}</label><input id="practice-input" class="practice-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Chữ Hán hoặc pinyin có dấu thanh" value="${esc(item.input)}" ${graded?'disabled':''}>`:`<p class="practice-muted">Bấm cụm từ để ghép; bấm lại cụm đã chọn để bỏ.</p><div class="practice-order-answer" id="practice-order-answer" aria-label="Câu đã ghép"></div><div class="practice-chunks">${item.order.map((chunk,i)=>`<button class="btn" data-chunk="${i}" lang="zh-Hans" ${graded?'disabled':''}>${esc(chunk)}</button>`).join('')}</div>`}</div>
      ${feedback(q,item)}
      <div class="practice-actions">${graded?button('practice-next',s.index===s.items.length-1?'Xem kết quả':'Câu tiếp theo',true):button('practice-check','Kiểm tra đáp án',true)}</div>${warning()}</div>`;
    $('practice-pause').onclick=()=>setup(true);
    const answer=()=>q.format==='input'?item.input:q.format==='order'?item.draft.map(i=>item.order[i]).join(''):item.order[item.draft[0]];
    const refreshCheck=()=>{if($('practice-check'))$('practice-check').disabled=!(q.format==='order'?item.draft.length===item.order.length:PracticeEngine.norm(answer()||''))||(q.audioText&&!item.heard);};
    root.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{item.draft=[+b.dataset.option];root.querySelectorAll('[data-option]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));persist();refreshCheck();});
    if($('practice-input')){
      $('practice-input').oninput=e=>{item.input=e.target.value;persist();refreshCheck();};
      $('practice-input').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing&&!$('practice-check')?.disabled){e.preventDefault();$('practice-check')?.click();}};
    }
    function renderChunks(){
      $('practice-order-answer').innerHTML=item.draft.map(i=>`<button class="btn" data-remove="${i}" lang="zh-Hans" ${graded?'disabled':''}>${esc(item.order[i])}</button>`).join('')||'<span class="practice-muted">Câu của bạn sẽ hiện ở đây</span>';
      root.querySelectorAll('[data-chunk]').forEach(b=>{b.disabled=graded||item.draft.includes(+b.dataset.chunk);});
      root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{item.draft=item.draft.filter(i=>i!==+b.dataset.remove);persist();renderChunks();refreshCheck();});
    }
    if(q.format==='order'){renderChunks();root.querySelectorAll('[data-chunk]').forEach(b=>b.onclick=()=>{item.draft.push(+b.dataset.chunk);persist();renderChunks();refreshCheck();});}
    if(q.audioText){
      audio=$('practice-audio');const player=audio;
      const failure=()=>{$('practice-audio-status').textContent='Chưa phát được âm thanh. Thử bấm phát lại hoặc mở index.html bằng Chrome/Edge. Câu chưa được chấm.';};
      player.onplay=()=>{audio=player;stopSpeech();hideSpeechFeedback();$('practice-audio-status').textContent='Đang nghe…';};
      player.onended=()=>{item.heard=true;persist();$('practice-audio-status').textContent='Đã nghe xong. Bạn có thể nghe lại tùy ý.';refreshCheck();};
      player.onerror=failure;
      $('practice-replay').onclick=()=>{try{player.currentTime=0;player.play()?.catch(failure);}catch{failure();}};
      $('practice-speed').onchange=e=>player.playbackRate=+e.target.value;
    }
    if($('practice-check'))$('practice-check').onclick=()=>{if($('practice-check').disabled)return;if(store.grade(answer())){touchStreak();showQuestion();}};
    if($('practice-next'))$('practice-next').onclick=()=>{store.next();showQuestion();};
    refreshCheck();focusTitle();
  }
  function results(){
    stopAudio();const s=store.state.session;if(!s)return setup(true);
    const correct=s.items.filter(i=>i.result?.correct).length, wrong=s.items.filter(i=>i.result&&!i.result.correct);
    const breakdown={};for(const item of s.items){const type=store.getQuestion(item.id).type;breakdown[type]??={total:0,correct:0};breakdown[type].total++;if(item.result?.correct)breakdown[type].correct++;}
    root.innerHTML=`<div class="practice-results glass"><span class="eyebrow">HOÀN THÀNH BỘ LUYỆN</span><h3 tabindex="-1" data-practice-title>${correct} / ${s.items.length} câu đúng</h3><p class="practice-score">${Math.round(correct/s.items.length*100)}<span>%</span></p><p>${wrong.length?'Luyện lại những câu chưa đúng để nhớ chắc hơn.':'Bạn đã hoàn thành chính xác toàn bộ bộ luyện này.'}</p>
      <div class="practice-breakdown">${Object.entries(breakdown).map(([type,n])=>`<span>${esc(PracticeEngine.types[type])}<b>${n.correct}/${n.total}</b></span>`).join('')}</div>
      <div class="practice-actions">${button('practice-retake','Làm lại toàn bài',true)}${wrong.length?button('practice-wrong',`Luyện lại ${wrong.length} câu sai`):''}${button('practice-new','Tạo bộ mới')}</div>
      <p class="practice-muted">Mỗi lần làm lại được tính thành một lượt luyện mới. Thống kê tổng vẫn giữ các lượt trước.</p>${warning()}</div>
      <div class="practice-review"><h3>Xem lại từng câu</h3>${s.items.map((item,i)=>{const q=store.getQuestion(item.id);return `<details class="glass"><summary><span class="${item.result.correct?'review-correct':'review-wrong'}">${item.result.correct?'✓ Đúng':'× Sai'}</span> Câu ${i+1} · ${esc(PracticeEngine.types[q.type])} · Bài ${q.lesson}</summary><p>${esc(q.prompt)}</p><p class="practice-review-stem">${esc(q.stem||q.transcript||q.answerText)}</p><p>Bạn trả lời: ${esc(item.result.answer)}</p>${feedback(q,item)}</details>`;}).join('')}</div>`;
    $('practice-retake').onclick=()=>{store.retake();showQuestion();};
    if($('practice-wrong'))$('practice-wrong').onclick=()=>{store.retake(true);showQuestion();};
    $('practice-new').onclick=()=>setup(true);focusTitle();
  }
  setup();
  return {stopAudio,getStats:()=>store.stats(),clearProgress(){stopAudio();store.clear();setup();}};
})();
