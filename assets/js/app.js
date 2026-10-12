// ============================================================ STORAGE HELPERS
const LS_VOCAB = "hsk3clone_vocab_status";
const LS_EX_STATS = "hsk3clone_ex_stats";
const LS_STREAK = "hsk3clone_streak";
const LS_GRAMMAR = "hsk3clone_grammar_seen";

function loadJSON(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } }
function saveJSON(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }

function vocabKey(bai, hz){ return bai + "_" + hz; }
function getVocabStatus(){ return loadJSON(LS_VOCAB, {}); }
function setVocabStatus(key, status){ const s = getVocabStatus(); s[key] = {status, ts: Date.now()}; saveJSON(LS_VOCAB, s); }

function getExStats(){
  const saved=loadJSON(LS_EX_STATS, {correct:0,total:0});
  const old=saved&&Number.isFinite(saved.correct)&&Number.isFinite(saved.total)?saved:{correct:0,total:0};
  const current=typeof Practice!=="undefined"?Practice.getStats():{correct:0,total:0};
  return {correct:old.correct+current.correct,total:old.total+current.total};
}

function touchStreak(){
  const today = new Date().toISOString().slice(0,10);
  let s = loadJSON(LS_STREAK, {lastDate:null, count:0});
  if(s.lastDate === today) return s;
  const y = new Date(Date.now()-86400000).toISOString().slice(0,10);
  s.count = (s.lastDate === y) ? s.count + 1 : 1;
  s.lastDate = today;
  saveJSON(LS_STREAK, s);
  return s;
}

function getGrammarSeen(){ return loadJSON(LS_GRAMMAR, {}); }
function markGrammarSeen(key){ const s = getGrammarSeen(); s[key] = true; saveJSON(LS_GRAMMAR, s); }

// ============================================================ PRESENTATION & NAV
function icon(name){ return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`; }
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const colorPreference = window.matchMedia('(prefers-color-scheme: dark)');

function updateThemeButton(){
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark' : colorPreference.matches;
  const button = document.getElementById('theme-toggle');
  button.innerHTML = icon(dark ? 'sun' : 'moon');
  button.setAttribute('aria-label', dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
  button.title = button.getAttribute('aria-label');
  document.querySelector('meta[name="theme-color"]').content = dark ? '#101e29' : '#edf4f5';
}
document.getElementById('theme-toggle').addEventListener('click', ()=>{
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark' : colorPreference.matches;
  const theme = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('hsk3clone_theme', theme); } catch (_) {}
  updateThemeButton();
});
colorPreference.addEventListener('change', updateThemeButton);
updateThemeButton();

function activateTab(name, scroll = true){
  if(typeof Practice!=="undefined") Practice.stopAudio();
  stopSpeech();
  hideSpeechFeedback();
  document.querySelectorAll('nav.main button').forEach(button=>{
    const active = button.dataset.tab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('.panel').forEach(panel=>{
    const active = panel.id === 'panel-' + name;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  document.querySelector('.welcome').hidden = name !== 'vocab';
  if(name === 'progress') renderProgress();
  if(scroll) document.getElementById('panel-' + name).scrollIntoView({behavior: motionPreference.matches ? 'instant' : 'smooth', block: 'start'});
}
const navButtons = Array.from(document.querySelectorAll('nav.main button'));
navButtons.forEach((button, index)=>{
  button.addEventListener('click', ()=>activateTab(button.dataset.tab));
  button.addEventListener('keydown', event=>{
    let next;
    if(event.key === 'ArrowRight') next = (index + 1) % navButtons.length;
    else if(event.key === 'ArrowLeft') next = (index + navButtons.length - 1) % navButtons.length;
    else if(event.key === 'Home') next = 0;
    else if(event.key === 'End') next = navButtons.length - 1;
    else return;
    event.preventDefault();
    navButtons[next].focus();
    activateTab(navButtons[next].dataset.tab);
  });
});
document.getElementById('view-progress').addEventListener('click', ()=>{
  activateTab('progress');
  document.getElementById('tab-progress').focus({preventScroll: true});
});
document.querySelectorAll('[data-scroll]').forEach(button=>{
  button.addEventListener('click', ()=>{
    const strip = document.getElementById(button.dataset.scroll);
    strip.scrollBy({left: Number(button.dataset.direction) * strip.clientWidth * .7, behavior: motionPreference.matches ? 'instant' : 'smooth'});
  });
});

function updateJourney(){
  const status = getVocabStatus();
  const words = Object.entries(VOCAB).flatMap(([bai, entries])=>entries.map(word=>vocabKey(bai, word[0])));
  const known = words.filter(key=>status[key]?.status === 'known').length;
  const percent = Math.round(known / words.length * 100);
  document.getElementById('journey-known').innerHTML = `${known} <span>/ ${words.length}</span>`;
  document.getElementById('journey-percent').innerHTML = `${percent}<small>%</small>`;
  document.getElementById('journey-ring').style.setProperty('--progress', percent + '%');
  document.getElementById('journey-note').textContent = known === words.length ? 'Bạn đã nhớ trọn bộ từ vựng!' : known ? 'Từng từ nhỏ, tiến bộ mỗi ngày.' : 'Bắt đầu với một từ mới nhé.';
}

// ============================================================ PRONUNCIATION
// Bundled WAV files work without installed OS voices, network access or a server.
// Keep the active media/utterance alive and ignore callbacks from older requests.
const speechState = { token: 0, audio: null, utterance: null, button: null, timer: null };
function setSpeechButton(button, state){
  if(!button) return;
  if(!button.dataset.idleLabel) button.dataset.idleLabel = button.getAttribute('aria-label');
  button.classList.toggle('is-speaking', state !== 'idle');
  button.setAttribute('aria-pressed', String(state !== 'idle'));
  button.setAttribute('aria-busy', String(state === 'loading'));
  button.setAttribute('aria-label', state === 'idle' ? button.dataset.idleLabel : 'Dừng phát âm');
  button.querySelector('.speak-label').textContent = state === 'loading' ? 'Đang tải…' : state === 'playing' ? 'Dừng nghe' : 'Nghe phát âm';
}
function stopSpeech(){
  speechState.token++;
  clearTimeout(speechState.timer);
  if(speechState.audio) speechState.audio.pause();
  if(speechState.utterance && 'speechSynthesis' in window){
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
  setSpeechButton(speechState.button, 'idle');
  speechState.audio = null;
  speechState.utterance = null;
  speechState.button = null;
}
function hideSpeechFeedback(){
  document.getElementById('speech-feedback').hidden = true;
  document.getElementById('speech-fallback').pause();
}
function showSpeechError(message, path){
  stopSpeech();
  document.getElementById('speech-message').textContent = message;
  const player = document.getElementById('speech-fallback');
  player.hidden = !path;
  if(path) player.src = path;
  document.getElementById('speech-feedback').hidden = false;
}
document.getElementById('speech-dismiss').addEventListener('click', hideSpeechFeedback);
window.addEventListener('pagehide', ()=>{ stopSpeech(); hideSpeechFeedback(); });

function speakWithBrowser(text, token){
  if(!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)){
    showSpeechError('Từ này chưa có file âm thanh và trình duyệt không hỗ trợ giọng đọc tiếng Trung.');
    return;
  }
  try {
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v=>/^(zh[-_]CN|cmn)/i.test(v.lang))
      || voices.find(v=>/^zh[-_](SG|TW)/i.test(v.lang));
    if(!voice){
      showSpeechError('Từ này chưa có file âm thanh. Hãy bổ sung file phát âm hoặc cài giọng tiếng Trung trên thiết bị.');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    speechState.utterance = utterance;
    utterance.lang = voice.lang;
    utterance.voice = voice;
    utterance.rate = 0.8;
    utterance.volume = 1;
    utterance.onstart = ()=>{
      if(token !== speechState.token) return;
      clearTimeout(speechState.timer);
      setSpeechButton(speechState.button, 'playing');
    };
    utterance.onend = ()=>{ if(token === speechState.token) stopSpeech(); };
    utterance.onerror = ()=>{
      if(token === speechState.token) showSpeechError('Giọng đọc của trình duyệt không phát được. Hãy thử nghe lại.');
    };
    speechState.timer = setTimeout(()=>{
      if(token === speechState.token) showSpeechError('Giọng đọc không phản hồi. Từ này cần được bổ sung file phát âm.');
    }, 5000);
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  } catch (_) {
    if(token === speechState.token) showSpeechError('Không khởi động được giọng đọc tiếng Trung.');
  }
}
function speak(text, button){
  if(typeof Practice!=="undefined") Practice.stopAudio();
  const sameButton = button && speechState.button === button;
  stopSpeech();
  hideSpeechFeedback();
  if(sameButton) return;
  const token = speechState.token;
  speechState.button = button;
  setSpeechButton(button, 'loading');
  const path = typeof VOCAB_AUDIO !== 'undefined' && VOCAB_AUDIO[text];
  if(!path){ speakWithBrowser(text, token); return; }
  const fail = error=>{
    if(token !== speechState.token) return;
    const message = error?.name === 'NotAllowedError'
      ? 'Trình duyệt đang chặn phát âm. Bấm nút phát ở thanh bên dưới để nghe.'
      : 'Không phát được file âm thanh. Hãy giữ cả thư mục assets/audio khi sao chép app; bạn có thể thử thanh phát bên dưới.';
    showSpeechError(message, path);
  };
  try {
    const audio = new Audio(path);
    speechState.audio = audio;
    audio.volume = 1;
    audio.onplaying = ()=>{
      if(token !== speechState.token) return;
      clearTimeout(speechState.timer);
      setSpeechButton(button, 'playing');
    };
    audio.onended = ()=>{ if(token === speechState.token) stopSpeech(); };
    audio.onerror = fail;
    speechState.timer = setTimeout(()=>{
      if(token === speechState.token) showSpeechError('Âm thanh chưa bắt đầu. Bấm nút phát bên dưới để thử lại.', path);
    }, 5000);
    // Call play directly from the user's click, before any async work.
    const playback = audio.play();
    if(playback) playback.catch(fail);
  } catch (error) { fail(error); }
}

// ============================================================ VOCAB TAB (luoi, hien tat ca tu cua bai)
let currentVocabBai = 1;
let vocabPool = [];

function buildVocabLessonTabs(){
  const wrap = document.getElementById('vocab-lesson-tabs');
  const scrollLeft = wrap.scrollLeft;
  const focused = wrap.contains(document.activeElement);
  wrap.innerHTML = '';
  Object.keys(VOCAB).forEach(bai=>{
    const b = document.createElement('button');
    b.textContent = 'Bài ' + bai;
    b.setAttribute('aria-pressed', String(parseInt(bai) === currentVocabBai));
    if(parseInt(bai) === currentVocabBai) b.classList.add('active');
    b.addEventListener('click', ()=>{ currentVocabBai = parseInt(bai); resetVocabPool(); buildVocabLessonTabs(); });
    wrap.appendChild(b);
  });
  wrap.scrollLeft = scrollLeft;
  if(focused) wrap.querySelector('.active').focus({preventScroll: true});
}

function resetVocabPool(){
  stopSpeech();
  hideSpeechFeedback();
  vocabPool = VOCAB[currentVocabBai].slice();
  document.getElementById('vocab-lesson-meta').textContent = 'Bài ' + String(currentVocabBai).padStart(2, '0') + ' · ' + vocabPool.length + ' từ';
  renderVocabGrid();
}

function revealCard(card, revealed){
  card.classList.toggle('revealed', revealed);
  card.querySelector('.card-face').setAttribute('aria-expanded', String(revealed));
  card.querySelector('.card-details').hidden = !revealed;
  card.querySelector('.reveal-hint').textContent = revealed ? 'Thu gọn thẻ' : 'Chạm để khám phá';
}

function renderVocabGrid(){
  const grid = document.getElementById('vocab-grid');
  grid.innerHTML = '';
  vocabPool.forEach(([hz, py, vi, ex_cn, ex_py, ex_vi], index)=>{
    const card = document.createElement('article');
    card.className = 'vgcard';
    card.dataset.state = 'new';
    card.innerHTML = `
      <button class="card-face" aria-expanded="false" aria-controls="word-${currentVocabBai}-${index}">
        <span class="card-top"><span class="bai-mini">BÀI ${String(currentVocabBai).padStart(2, '0')}</span>${icon('arrow')}</span>
        <span class="hz" lang="zh-CN">${hz}</span>
        <span class="reveal-hint">Chạm để khám phá</span>
      </button>
      <button class="speak-mini" aria-label="Nghe phát âm ${hz}" aria-pressed="false">${icon('volume')} <span class="speak-label">Nghe phát âm</span></button>
      <div class="card-details" id="word-${currentVocabBai}-${index}" hidden>
      <div class="py">${py}</div>
      <div class="vi">${vi}</div>
      ${ex_cn ? `<div class="vg-example">
        <div class="vg-ex-cn">${ex_cn}</div>
        <div class="vg-ex-py">${ex_py}</div>
        <div class="vg-ex-vi">${ex_vi || ''}</div>
      </div>` : ''}
      <div class="mark-row">
        <button class="mark-btn mark-no" aria-pressed="false">${icon('refresh')} Ôn lại</button>
        <button class="mark-btn mark-yes" aria-pressed="false">${icon('check')} Đã nhớ</button>
      </div>
      </div>
      <div class="status" aria-live="polite"></div>
    `;
    card.querySelector('.card-face').addEventListener('click', ()=>revealCard(card, !card.classList.contains('revealed')));
    card.querySelector('.speak-mini').addEventListener('click', (e)=>{ e.stopPropagation(); speak(hz, e.currentTarget); });
    card.querySelector('.mark-yes').addEventListener('click', (e)=>{
      e.stopPropagation();
      card.dataset.state = 'known';
      card.classList.remove('review'); card.classList.add('known');
      card.querySelector('.status').textContent = '✓ Đã nhớ';
      card.querySelector('.mark-yes').setAttribute('aria-pressed', 'true');
      card.querySelector('.mark-no').setAttribute('aria-pressed', 'false');
      setVocabStatus(vocabKey(currentVocabBai,hz), 'known');
      updateVocabProgress();
    });
    card.querySelector('.mark-no').addEventListener('click', (e)=>{
      e.stopPropagation();
      card.dataset.state = 'review';
      card.classList.remove('known'); card.classList.add('review');
      card.querySelector('.status').textContent = '↻ Ôn lại';
      card.querySelector('.mark-no').setAttribute('aria-pressed', 'true');
      card.querySelector('.mark-yes').setAttribute('aria-pressed', 'false');
      setVocabStatus(vocabKey(currentVocabBai,hz), 'review');
      updateVocabProgress();
    });
    const st = getVocabStatus()[vocabKey(currentVocabBai,hz)];
    if(st?.status === 'known'){ card.dataset.state='known'; card.classList.add('known'); card.querySelector('.status').textContent='✓ Đã nhớ'; }
    else if(st?.status === 'review'){ card.dataset.state='review'; card.classList.add('review'); card.querySelector('.status').textContent='↻ Ôn lại'; }
    card.querySelector('.mark-yes').setAttribute('aria-pressed', String(st?.status === 'known'));
    card.querySelector('.mark-no').setAttribute('aria-pressed', String(st?.status === 'review'));
    grid.appendChild(card);
  });
  updateVocabProgress();
}

function updateVocabProgress(){
  const cards = document.querySelectorAll('#vocab-grid .vgcard');
  let known = 0, marked = 0;
  cards.forEach(c=>{
    if(c.dataset.state === 'known'){ known++; marked++; }
    else if(c.dataset.state === 'review'){ marked++; }
  });
  const total = cards.length || 1;
  document.getElementById('vocab-pos').textContent = marked+'/'+cards.length+' đã đánh giá';
  document.getElementById('vocab-known-count').textContent = 'Đã nhớ: '+known+'/'+cards.length;
  document.getElementById('vocab-bar').style.width = (marked/total*100)+'%';
  document.getElementById('vocab-progress-track').setAttribute('aria-valuenow', Math.round(marked / total * 100));
  updateJourney();
}
document.getElementById('vocab-reveal-all').addEventListener('click', ()=>{
  document.querySelectorAll('#vocab-grid .vgcard').forEach(c=>revealCard(c, true));
});
document.getElementById('vocab-hide-all').addEventListener('click', ()=>{
  document.querySelectorAll('#vocab-grid .vgcard').forEach(c=>revealCard(c, false));
});

// ============================================================ GRAMMAR TAB
let currentGrammarBai = 1;

function buildGrammarLessonTabs(){
  const wrap = document.getElementById('grammar-lesson-tabs');
  const scrollLeft = wrap.scrollLeft;
  const focused = wrap.contains(document.activeElement);
  wrap.innerHTML = '';
  Object.keys(GRAMMAR).forEach(bai=>{
    const b = document.createElement('button');
    b.textContent = 'Bài ' + bai;
    b.setAttribute('aria-pressed', String(parseInt(bai) === currentGrammarBai));
    if(parseInt(bai) === currentGrammarBai) b.classList.add('active');
    b.addEventListener('click', ()=>{ currentGrammarBai = parseInt(bai); buildGrammarLessonTabs(); renderGrammarList(); });
    wrap.appendChild(b);
  });
  wrap.scrollLeft = scrollLeft;
  if(focused) wrap.querySelector('.active').focus({preventScroll: true});
}

function renderGrammarList(){
  const list = document.getElementById('grammar-list');
  list.innerHTML = '';
  GRAMMAR[currentGrammarBai].forEach((item, idx)=>{
    const key = currentGrammarBai + '_' + idx;
    markGrammarSeen(key);
    const card = document.createElement('div');
    card.className = 'g-card';
    const confuseRows = item.confusable.rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    const breakdownSpans = item.breakdown.map(([seg,py,mean])=>`<span class="seg"><b>${seg}</b><span class="py2"> ${py}</span> = ${mean}</span>`).join(' ');
    card.innerHTML = `
      <div class="g-head">
        <span class="g-title">${item.title}</span>
        <span class="g-tag">${item.tag}</span>
      </div>
      <div class="g-usage">${item.usage}</div>
      <div class="g-formula">${item.structure}</div>
      <div class="g-example">
        <div class="cn">${item.ex_cn}</div>
        <div class="py">${item.ex_py}</div>
        <div class="vi">→ ${item.ex_vi}</div>
      </div>
      <button class="breakdown-btn" id="bd-btn-${key}" aria-expanded="false" aria-controls="bd-${key}">Phân tích câu</button>
      <div class="breakdown" id="bd-${key}">${breakdownSpans}</div>
      <div class="confuse-box">
        <div class="confuse-title">Dễ nhầm với: ${item.confusable.vs}</div>
        <table class="confuse-table">${confuseRows}</table>
      </div>
    `;
    list.appendChild(card);
    document.getElementById(`bd-btn-${key}`).addEventListener('click', ()=>{
      const expanded = document.getElementById(`bd-${key}`).classList.toggle('show');
      document.getElementById(`bd-btn-${key}`).setAttribute('aria-expanded', String(expanded));
    });
  });
}

// ============================================================ PROGRESS TAB
function renderProgress(){
  touchStreak();
  const status = getVocabStatus();
  const allWords = Object.entries(VOCAB).flatMap(([bai,words])=> words.map(w=>({bai,hz:w[0]})));
  let known=0, review=0;
  allWords.forEach(w=>{
    const st = status[vocabKey(w.bai,w.hz)];
    if(st?.status === 'known') known++;
    else if(st?.status === 'review') review++;
  });
  const learning = allWords.length - known - review;
  const exStats = getExStats();
  const accuracy = exStats.total ? Math.round(exStats.correct/exStats.total*100) : 0;
  const streak = loadJSON(LS_STREAK, {count:0}).count;
  const grammarSeen = Object.keys(getGrammarSeen()).length;
  const grammarTotal = Object.values(GRAMMAR).reduce((a,g)=>a+g.length,0);

  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card"><div class="label">📖 Từ vựng đã nhớ</div><div class="value jade">${known}/${allWords.length}</div></div>
    <div class="stat-card"><div class="label">🔄 Từ cần ôn</div><div class="value seal">${review}</div></div>
    <div class="stat-card"><div class="label">📚 Ngữ pháp đã xem</div><div class="value gold">${grammarSeen}/${grammarTotal}</div></div>
    <div class="stat-card"><div class="label">✏️ Bài tập chính xác</div><div class="value">${accuracy}%</div></div>
    <div class="stat-card"><div class="label">🔥 Chuỗi ngày học</div><div class="value seal">${streak}</div></div>
  `;

  document.getElementById('vocab-breakdown').innerHTML = `
    <button class="vb-chip vb-known" id="vb-known-chip"><span class="n">${known}</span><span class="l">Đã nhớ</span></button>
    <button class="vb-chip vb-learning" id="vb-learning-chip"><span class="n">${learning}</span><span class="l">Đang học</span></button>
    <button class="vb-chip vb-review" id="vb-review-chip"><span class="n">${review}</span><span class="l">Cần ôn</span></button>
  `;

  function showFiltered(filterFn, title){
    const box = document.getElementById('filtered-list');
    const words = allWords.filter(filterFn);
    box.innerHTML = `<h4 style="margin:0 0 10px;">${title} (${words.length})</h4>` +
      words.map(w=>{
        const wordData = VOCAB[w.bai].find(v=>v[0]===w.hz);
        return `<div class="filtered-word">
          <b>${wordData[0]}</b> <span>${wordData[1]}</span> — ${wordData[2]}
        </div>`;
      }).join('');
    box.classList.add('show');
  }
  document.getElementById('vb-review-chip').addEventListener('click', ()=> showFiltered(w=> status[vocabKey(w.bai,w.hz)]?.status === 'review', '🔴 Từ cần ôn'));
  document.getElementById('vb-learning-chip').addEventListener('click', ()=> showFiltered(w=> !status[vocabKey(w.bai,w.hz)], '🟡 Từ đang học (chưa đánh giá)'));
  document.getElementById('vb-known-chip').addEventListener('click', ()=> showFiltered(w=> status[vocabKey(w.bai,w.hz)]?.status === 'known', '🟢 Từ đã nhớ'));

  const reviewWords = allWords.filter(w=> status[vocabKey(w.bai,w.hz)]?.status === 'review');
  const newWords = allWords.filter(w=> !status[vocabKey(w.bai,w.hz)]).slice(0,5);
  const todayReview = reviewWords.concat(newWords);
  document.getElementById('review-count').textContent = todayReview.length + ' từ cần ôn';
  document.getElementById('start-review-btn').onclick = ()=>{
    if(todayReview.length === 0){ alert('Không có từ nào cần ôn hôm nay — bạn học tốt lắm! 🎉'); return; }
    currentVocabBai = parseInt(todayReview[0].bai);
    buildVocabLessonTabs();
    resetVocabPool();
    activateTab('vocab');
    document.getElementById('tab-vocab').focus({preventScroll: true});
    document.querySelector('#vocab-lesson-tabs .active').scrollIntoView({block: 'nearest', inline: 'center', behavior: 'instant'});
  };
}

document.getElementById('reset-progress-btn').addEventListener('click', ()=>{
  if(!confirm('Xoá toàn bộ tiến độ học của bản clone trên trình duyệt này?')) return;
  localStorage.removeItem(LS_VOCAB);
  localStorage.removeItem(LS_EX_STATS);
  localStorage.removeItem(LS_STREAK);
  localStorage.removeItem(LS_GRAMMAR);
  if(typeof Practice!=="undefined") Practice.clearProgress();
  resetVocabPool();
  renderProgress();
});

// ============================================================ INIT
buildVocabLessonTabs();
resetVocabPool();
buildGrammarLessonTabs();
renderGrammarList();
