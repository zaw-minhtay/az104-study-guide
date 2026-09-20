(() => {
  const QUESTIONS = window.AZ104_QUESTIONS || [];
  const EXPLANATIONS = window.AZ104_EXPLANATIONS || {};
  const ANSWER_ALERTS = {
    458: 'The listed answer (B, "Protocol to UDP") looks inconsistent with real Azure load balancer behavior. Sticky sessions for the same web server are achieved via session persistence to client IP (option A), not by changing the protocol to UDP. Verify against the source PDF / discussion link.',
    474: 'The listed answer (B, PPTP) looks inconsistent with real Azure VPN gateway behavior. Azure route-based Site-to-Site VPN gateways use IKEv1/IKEv2 (option C is IKEv2), not PPTP, which Azure VPN gateways do not support at all. Verify against the source PDF / discussion link.',
    513: 'The listed answer (B, "the public networking type") may be inconsistent with real Azure Container Instances behavior. Private networking for ACI (and its DNS name label scope reuse features) requires the container group to use a Linux OS type, not just a networking-type setting. Verify against the source PDF / discussion link.',
    523: 'The listed answer (B, "Networking type") may be inconsistent with real Azure Container Instances behavior. Private networking is unavailable for Windows container groups regardless of the networking-type setting, so the setting that actually needs to change is OS type (option D) to Linux. Verify against the source PDF / discussion link.',
  };
  const STORAGE_KEY = 'az104-practice-v1';

  const icons = { dashboard:'⌂', practice:'✎', exam:'⏱', review:'✓' };
  const navItems = [
    ['dashboard','Dashboard'],['practice','Practice'],['exam','Mock Exam'],['review','Review']
  ];

  const state = {
    view: 'dashboard',
    progress: loadProgress(),
    practice: { topic:'all', status:'all', search:'', ids: QUESTIONS.map(q=>q.id), index:0, selected:[], revealed:false },
    reviewTab: 'wrong',
    exam: null,
    timerHandle: null,
  };

  function loadProgress(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveProgress(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
  function pget(id){ return state.progress[id] || {}; }
  function pset(id, patch){ state.progress[id] = {...pget(id), ...patch}; saveProgress(); }
  function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function fmtPrompt(s=''){ return escapeHtml(s).replace(/\n/g,'<br>'); }
  function topicList(){ return [...new Set(QUESTIONS.map(q=>q.topic))].sort((a,b)=>a-b); }
  function isAutoGradable(q){ return q.options.length > 0 && q.answer_letters.length > 0; }
  function arraysEqual(a,b){ return [...a].sort().join('|') === [...b].sort().join('|'); }
  function calcStats(){
    let attempted=0, correct=0, wrong=0, bookmarked=0;
    QUESTIONS.forEach(q=>{
      const p=pget(q.id);
      if(p.attempted) attempted++;
      if(p.correct===true) correct++;
      if(p.correct===false) wrong++;
      if(p.bookmarked) bookmarked++;
    });
    return {attempted, correct, wrong, bookmarked, remaining:QUESTIONS.length-attempted, accuracy:attempted?Math.round(correct/Math.max(1,correct+wrong)*100):0};
  }

  function shell(body, title, subtitle=''){
    const nav = navItems.map(([id,label]) => `<button data-nav="${id}" class="${state.view===id?'active':''}"><span class="icon">${icons[id]}</span>${label}</button>`).join('');
    const mobile = navItems.map(([id,label]) => `<button data-nav="${id}" class="${state.view===id?'active':''}">${label}</button>`).join('');
    return `<div class="mobile-nav">${mobile}</div><div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">AZ</div><div><div class="brand-title">AZ-104 Practice</div><div class="brand-sub">606 questions</div></div></div>
        <nav class="nav">${nav}</nav>
        <div class="sidebar-footer">Offline-first practice app<br>Progress is saved in this browser.</div>
      </aside>
      <main class="main"><div class="topbar"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div></div><div class="content">${body}</div></main>
    </div>`;
  }

  function render(){
    if(state.timerHandle){ clearInterval(state.timerHandle); state.timerHandle=null; }
    let html='';
    if(state.view==='dashboard') html=renderDashboard();
    if(state.view==='practice') html=renderPractice();
    if(state.view==='exam') html=renderExam();
    if(state.view==='review') html=renderReview();
    document.getElementById('app').innerHTML=html;
    bindCommon();
    if(state.view==='practice') bindPractice();
    if(state.view==='exam') bindExam();
    if(state.view==='review') bindReview();
  }

  function renderDashboard(){
    const s=calcStats();
    const topicRows=topicList().map(t=>{
      const qs=QUESTIONS.filter(q=>q.topic===t);
      const done=qs.filter(q=>pget(q.id).attempted).length;
      const pct=Math.round(done/qs.length*100);
      return `<div class="topic-row"><div class="topic-name">Topic ${t}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="topic-meta">${done}/${qs.length}</div><div class="topic-meta">${pct}%</div></div>`;
    }).join('');
    return shell(`
      <div class="grid stats-grid">
        <div class="card stat"><div class="label">Total questions</div><div class="value">${QUESTIONS.length}</div><div class="hint">Across ${topicList().length} source topics</div></div>
        <div class="card stat"><div class="label">Completed</div><div class="value">${s.attempted}</div><div class="hint">${Math.round(s.attempted/QUESTIONS.length*100)}% of question bank</div></div>
        <div class="card stat"><div class="label">Accuracy</div><div class="value">${s.accuracy}%</div><div class="hint">Auto-graded answers only</div></div>
        <div class="card stat"><div class="label">Needs review</div><div class="value">${s.wrong}</div><div class="hint">${s.bookmarked} bookmarked</div></div>
      </div>
      <section class="card section"><div class="section-head"><div><h2>Quick start</h2><p>Continue practicing, run a randomized mock exam, or revisit weak questions.</p></div></div>
        <div class="actions"><button class="btn primary" data-go="practice">Start Practice</button><button class="btn" data-go="exam">Create Mock Exam</button><button class="btn" data-go="wrong">Review Wrong Answers</button></div>
      </section>
      <section class="card section"><div class="section-head"><div><h2>Progress by source topic</h2><p>Topic numbers are preserved from the PDF.</p></div></div>${topicRows}</section>
    `,'Dashboard','Track your AZ-104 practice progress.');
  }

  function filteredPracticeIds(){
    const {topic,status,search}=state.practice;
    const needle=search.trim().toLowerCase();
    return QUESTIONS.filter(q=>{
      if(topic!=='all' && String(q.topic)!==String(topic)) return false;
      const p=pget(q.id);
      if(status==='unanswered' && p.attempted) return false;
      if(status==='wrong' && p.correct!==false) return false;
      if(status==='bookmarked' && !p.bookmarked) return false;
      if(status==='correct' && p.correct!==true) return false;
      if(needle && !(`${q.prompt} ${q.options.map(o=>o.text).join(' ')}`.toLowerCase().includes(needle))) return false;
      return true;
    }).map(q=>q.id);
  }

  function questionVisuals(q){
    if(!q.images.length) return '';
    return `<div class="visuals">${q.images.map((im,i)=>`<img loading="lazy" src="${im.src}" alt="Question ${q.id} visual ${i+1}" data-zoom="${im.src}">`).join('')}</div>`;
  }

  function questionChoices(q, selected, revealed, sourceCorrect){
    if(!q.options.length) return `<div class="notice">This source question uses a visual/answer-area format. Work out your answer, then reveal the PDF's source answer.</div>`;
    const inputType=q.type==='multiple'?'checkbox':'radio';
    return `<div class="choice-list">${q.options.map(o=>{
      const sel=selected.includes(o.label);
      let cls=sel?'selected':'';
      if(revealed && sourceCorrect){
        if(q.answer_letters.includes(o.label)) cls+=' correct';
        else if(sel) cls+=' wrong';
      }
      return `<label class="choice ${cls}" data-choice-row="${o.label}"><input ${revealed?'disabled':''} type="${inputType}" name="choice" value="${o.label}" ${sel?'checked':''}><span class="choice-label">${o.label}.</span><span>${escapeHtml(o.text)}</span></label>`;
    }).join('')}</div>`;
  }

  function renderQuestion(q, ctx='practice'){
    const isExam=ctx==='exam';
    const local = isExam ? examAnswerFor(q.id) : state.practice;
    const p=pget(q.id);
    const selected = isExam ? (local.selected||[]) : state.practice.selected;
    const revealed = isExam ? !!state.exam.finished : state.practice.revealed;
    const correct = isAutoGradable(q) && arraysEqual(selected, q.answer_letters);
    let answerBox='';
    if(revealed){
      const cls=isAutoGradable(q)?(correct?'correct':'wrong'):'';
      const title=isAutoGradable(q)?(correct?'Correct':'Incorrect'):'Source answer';
      const explanation=EXPLANATIONS[String(q.id)];
      const alertMsg=ANSWER_ALERTS[q.id];
      answerBox=`<div class="answer-box ${cls}"><div class="answer-title">${title}</div><div class="answer-text"><strong>Answer:</strong> ${q.answer ? escapeHtml(q.answer).replace(/\n/g,'<br>') : '<em>No answer text was found in the source PDF.</em>'}</div>${explanation?`<div class="answer-explanation"><strong>AI explanation:</strong> ${escapeHtml(explanation).replace(/\n/g,'<br>')}</div>`:''}${alertMsg?`<div class="answer-alert"><strong>⚠ Possible answer key error</strong>${escapeHtml(alertMsg)}</div>`:''}${q.source_notes?`<div class="answer-meta"><span>Source note: ${escapeHtml(q.source_notes)}</span></div>`:''}<div class="answer-meta"><span>PDF page${q.source_pages[0]===q.source_pages[1]?'':'s'} ${q.source_pages.join('–')}</span>${q.discussion_url?`<a href="${escapeHtml(q.discussion_url)}" target="_blank" rel="noopener">Open discussion</a>`:''}</div></div>`;
    }
    return `<div class="card question-card">
      <div class="question-top"><div class="badges"><span class="badge blue">Topic ${q.topic}</span><span class="badge">Source Q${q.source_number}</span><span class="badge">${q.type==='single'?'Single choice':q.type==='multiple'?'Multiple choice':q.type==='hotspot'?'Hotspot':'Drag & drop'}</span>${p.correct===false?'<span class="badge yellow">Previously wrong</span>':''}${ANSWER_ALERTS[q.id]?'<span class="badge red">⚠ Answer key alert</span>':''}</div>${!isExam?`<button class="bookmark ${p.bookmarked?'on':''}" data-bookmark="${q.id}" title="Bookmark">${p.bookmarked?'★':'☆'}</button>`:''}</div>
      <div class="prompt">${fmtPrompt(q.prompt)}</div>
      ${questionVisuals(q)}
      ${questionChoices(q,selected,revealed,true)}
      ${answerBox}
    </div>`;
  }

  function renderPractice(){
    const ids=filteredPracticeIds(); state.practice.ids=ids;
    if(!ids.length){
      return shell(`<section class="card section"><div class="filters">${practiceFilters()}</div><div class="empty">No questions match these filters.</div></section>`,'Practice','Study one question at a time with immediate feedback.');
    }
    if(state.practice.index>=ids.length) state.practice.index=0;
    const q=QUESTIONS[ids[state.practice.index]-1];
    const side=`<aside class="card navigator"><h3>Question navigator</h3><div class="nav-grid">${ids.map((id,i)=>{
      const p=pget(id); let cls=i===state.practice.index?'current ':'';
      if(p.correct===true) cls+='correct '; if(p.correct===false) cls+='wrong '; if(p.bookmarked) cls+='bookmarked';
      return `<button class="nav-q ${cls}" data-jump="${i}">${i+1}</button>`;
    }).join('')}</div><div class="legend"><span><i class="dot green"></i>Correct</span><span><i class="dot red"></i>Wrong</span><span><i class="dot yellow"></i>Bookmarked</span></div></aside>`;
    const canPrev=state.practice.index>0, canNext=state.practice.index<ids.length-1;
    const submitLabel=q.options.length?'Submit answer':'Reveal answer';
    const actions=`<div class="question-actions"><div class="actions"><button class="btn" data-prev ${canPrev?'':'disabled'}>Previous</button><button class="btn" data-next ${canNext?'':'disabled'}>Next</button></div><div class="actions">${state.practice.revealed?'<button class="btn" data-reset-current>Try again</button>':`<button class="btn primary" data-submit>${submitLabel}</button>`}</div></div>`;
    return shell(`<section class="card section" style="padding:14px 16px;margin-top:0"><div class="filters">${practiceFilters()}</div></section><div class="practice-layout"> <div>${renderQuestion(q)}${actions}</div>${side}</div>`,'Practice',`${ids.length} questions in the current filter.`);
  }

  function practiceFilters(){
    return `<select class="select" id="topic-filter"><option value="all">All topics</option>${topicList().map(t=>`<option value="${t}" ${String(state.practice.topic)===String(t)?'selected':''}>Topic ${t}</option>`).join('')}</select>
      <select class="select" id="status-filter"><option value="all" ${state.practice.status==='all'?'selected':''}>All questions</option><option value="unanswered" ${state.practice.status==='unanswered'?'selected':''}>Unanswered</option><option value="wrong" ${state.practice.status==='wrong'?'selected':''}>Wrong answers</option><option value="correct" ${state.practice.status==='correct'?'selected':''}>Correct answers</option><option value="bookmarked" ${state.practice.status==='bookmarked'?'selected':''}>Bookmarked</option></select>
      <input class="input" id="practice-search" placeholder="Search questions" value="${escapeHtml(state.practice.search)}">`;
  }

  function resetPracticeQuestion(){ state.practice.selected=[]; state.practice.revealed=false; }

  function renderExam(){
    if(!state.exam) return renderExamSetup();
    if(state.exam.finished) return renderExamResults();
    const idx=state.exam.index, q=QUESTIONS[state.exam.ids[idx]-1];
    return shell(`<div class="exam-head"><div><strong>Question ${idx+1} of ${state.exam.ids.length}</strong><div style="color:var(--muted);font-size:13px;margin-top:4px">Answers are hidden until you finish.</div></div><div class="timer" id="timer">${formatTime(state.exam.remaining)}</div></div><div class="practice-layout"><div>${renderQuestion(q,'exam')}<div class="question-actions"><div class="actions"><button class="btn" data-exam-prev ${idx>0?'':'disabled'}>Previous</button><button class="btn" data-exam-next ${idx<state.exam.ids.length-1?'':'disabled'}>Next</button></div><div class="actions"><button class="btn" data-exam-review>${examAnswerFor(q.id).marked?'★ Marked':'☆ Mark for review'}</button><button class="btn primary" data-finish-exam>Finish exam</button></div></div></div>${renderExamNavigator()}</div>`,'Mock Exam','Randomized practice with exam-style answer hiding.');
  }

  function renderExamSetup(){
    return shell(`<section class="card section"><div class="section-head"><div><h2>Create a mock exam</h2><p>Questions are randomized from the topics you choose.</p></div></div>
      <div class="setup-grid"><div class="field"><label>Number of questions</label><select id="exam-count" class="select"><option>20</option><option selected>50</option><option>100</option><option>606</option></select></div><div class="field"><label>Time limit (minutes)</label><input id="exam-minutes" class="input" type="number" min="5" max="300" value="60"></div></div>
      <div class="field" style="margin-top:16px"><label>Topics</label><div class="topic-checks"><label class="check-chip"><input type="checkbox" id="all-topics" checked> All</label>${topicList().map(t=>`<label class="check-chip"><input type="checkbox" name="exam-topic" value="${t}" checked> Topic ${t}</label>`).join('')}</div></div>
      <div class="actions" style="margin-top:20px"><button class="btn primary" data-start-exam>Start mock exam</button></div></section>`,'Mock Exam','Build a timed randomized test from the 606-question bank.');
  }

  function examAnswerFor(id){
    if(!state.exam.answers[id]) state.exam.answers[id]={selected:[],marked:false};
    return state.exam.answers[id];
  }

  function renderExamNavigator(){
    return `<aside class="card navigator"><h3>Exam navigator</h3><div class="nav-grid">${state.exam.ids.map((id,i)=>{
      const a=examAnswerFor(id); const answered=a.selected.length>0; return `<button class="nav-q ${i===state.exam.index?'current':''} ${a.marked?'bookmarked':''}" data-exam-jump="${i}" style="${answered?'background:#eef5fb':''}">${i+1}</button>`;
    }).join('')}</div><div class="legend"><span><i class="dot" style="background:#a9c9e7"></i>Answered</span><span><i class="dot yellow"></i>Marked</span></div></aside>`;
  }

  function renderExamResults(){
    let auto=0, correct=0, wrong=0, ungraded=0;
    state.exam.ids.forEach(id=>{
      const q=QUESTIONS[id-1], a=examAnswerFor(id);
      if(isAutoGradable(q)){ auto++; if(arraysEqual(a.selected,q.answer_letters)) correct++; else wrong++; }
      else ungraded++;
    });
    const pct=auto?Math.round(correct/auto*100):0;
    const reviewList=state.exam.ids.map((id,i)=>{
      const q=QUESTIONS[id-1], a=examAnswerFor(id); let label='Visual / self-review'; let cls='';
      if(isAutoGradable(q)){ const ok=arraysEqual(a.selected,q.answer_letters); label=ok?'Correct':'Incorrect'; cls=ok?'green':'yellow'; }
      return `<div class="list-item"><div><div class="title">${i+1}. Topic ${q.topic} · Source Q${q.source_number} <span class="badge ${cls}">${label}</span></div><div class="snippet">${escapeHtml(q.prompt.replace(/\n/g,' '))}</div></div><button class="btn small" data-result-open="${i}">Review</button></div>`;
    }).join('');
    const active=state.exam.reviewIndex;
    const reviewQ = Number.isInteger(active) ? QUESTIONS[state.exam.ids[active]-1] : null;
    return shell(`<div class="grid exam-results"><div class="card result"><strong>${pct}%</strong><span>Auto-graded score</span></div><div class="card result"><strong>${correct}/${auto}</strong><span>Correct auto-graded</span></div><div class="card result"><strong>${ungraded}</strong><span>Visual questions to self-review</span></div></div>
      <section class="card section"><div class="section-head"><div><h2>Exam review</h2><p>Source answers are now visible.</p></div><button class="btn" data-new-exam>New exam</button></div>${reviewQ?`<div style="margin-bottom:18px">${renderQuestion(reviewQ,'exam')}</div>`:''}<div class="list">${reviewList}</div></section>`,'Mock Exam Results',`${state.exam.ids.length} questions completed.`);
  }

  function renderReview(){
    const tabs=[['wrong','Wrong'],['bookmarked','Bookmarked'],['unanswered','Unanswered']];
    const ids=QUESTIONS.filter(q=>{ const p=pget(q.id); if(state.reviewTab==='wrong') return p.correct===false; if(state.reviewTab==='bookmarked') return p.bookmarked; return !p.attempted; }).map(q=>q.id);
    const list=ids.length?ids.map(id=>{ const q=QUESTIONS[id-1]; return `<div class="list-item"><div><div class="title">Topic ${q.topic} · Source Q${q.source_number}</div><div class="snippet">${escapeHtml(q.prompt.replace(/\n/g,' '))}</div></div><button class="btn small" data-review-open="${id}">Practice</button></div>`; }).join(''):`<div class="empty">Nothing in this category yet.</div>`;
    return shell(`<section class="card section"><div class="review-tabs">${tabs.map(([id,l])=>`<button class="btn small ${state.reviewTab===id?'primary':''}" data-review-tab="${id}">${l}</button>`).join('')}</div><div class="list">${list}</div></section>`,'Review','Focus on mistakes, bookmarks, or questions you have not answered yet.');
  }

  function bindCommon(){
    document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{ state.view=b.dataset.nav; if(state.view!=='exam' && state.exam && !state.exam.finished){} render(); });
    document.querySelectorAll('[data-go="practice"]').forEach(b=>b.onclick=()=>{state.view='practice';render();});
    document.querySelectorAll('[data-go="exam"]').forEach(b=>b.onclick=()=>{state.view='exam';render();});
    document.querySelectorAll('[data-go="wrong"]').forEach(b=>b.onclick=()=>{state.reviewTab='wrong';state.view='review';render();});
    document.querySelectorAll('[data-zoom]').forEach(img=>img.onclick=()=>openModal(img.dataset.zoom));
  }

  function bindPractice(){
    const tf=document.getElementById('topic-filter'), sf=document.getElementById('status-filter'), sr=document.getElementById('practice-search');
    if(tf) tf.onchange=()=>{state.practice.topic=tf.value;state.practice.index=0;resetPracticeQuestion();render();};
    if(sf) sf.onchange=()=>{state.practice.status=sf.value;state.practice.index=0;resetPracticeQuestion();render();};
    if(sr){ let t; sr.oninput=()=>{clearTimeout(t);t=setTimeout(()=>{state.practice.search=sr.value;state.practice.index=0;resetPracticeQuestion();render();},250);}; }
    document.querySelectorAll('input[name="choice"]').forEach(i=>i.onchange=()=>{
      const q=QUESTIONS[state.practice.ids[state.practice.index]-1];
      if(q.type==='multiple') state.practice.selected=[...document.querySelectorAll('input[name="choice"]:checked')].map(x=>x.value);
      else state.practice.selected=[i.value];
      document.querySelectorAll('[data-choice-row]').forEach(r=>r.classList.toggle('selected',state.practice.selected.includes(r.dataset.choiceRow)));
    });
    document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{state.practice.index=Number(b.dataset.jump);resetPracticeQuestion();render();});
    const prev=document.querySelector('[data-prev]'), next=document.querySelector('[data-next]');
    if(prev) prev.onclick=()=>{state.practice.index--;resetPracticeQuestion();render();};
    if(next) next.onclick=()=>{state.practice.index++;resetPracticeQuestion();render();};
    const bm=document.querySelector('[data-bookmark]');
    if(bm) bm.onclick=()=>{const id=Number(bm.dataset.bookmark);pset(id,{bookmarked:!pget(id).bookmarked});render();};
    const submit=document.querySelector('[data-submit]');
    if(submit) submit.onclick=()=>{
      const q=QUESTIONS[state.practice.ids[state.practice.index]-1];
      if(q.options.length && state.practice.selected.length===0){ alert('Select an answer first.'); return; }
      let correct=null;
      if(isAutoGradable(q)) correct=arraysEqual(state.practice.selected,q.answer_letters);
      const old=pget(q.id);
      pset(q.id,{attempted:true,correct,selected:state.practice.selected,attempts:(old.attempts||0)+1,lastAttempt:Date.now()});
      state.practice.revealed=true; render();
    };
    const reset=document.querySelector('[data-reset-current]'); if(reset) reset.onclick=()=>{resetPracticeQuestion();render();};
  }

  function bindExam(){
    if(!state.exam){
      const all=document.getElementById('all-topics');
      if(all) all.onchange=()=>document.querySelectorAll('input[name="exam-topic"]').forEach(x=>x.checked=all.checked);
      document.querySelectorAll('input[name="exam-topic"]').forEach(x=>x.onchange=()=>{const xs=[...document.querySelectorAll('input[name="exam-topic"]')]; document.getElementById('all-topics').checked=xs.every(v=>v.checked);});
      const start=document.querySelector('[data-start-exam]'); if(start) start.onclick=startExam;
      return;
    }
    if(state.exam.finished){
      document.querySelectorAll('[data-result-open]').forEach(b=>b.onclick=()=>{state.exam.reviewIndex=Number(b.dataset.resultOpen);render();});
      const n=document.querySelector('[data-new-exam]'); if(n)n.onclick=()=>{state.exam=null;render();};
      return;
    }
    startTimerLoop();
    const q=QUESTIONS[state.exam.ids[state.exam.index]-1];
    document.querySelectorAll('input[name="choice"]').forEach(i=>i.onchange=()=>{
      const a=examAnswerFor(q.id);
      if(q.type==='multiple') a.selected=[...document.querySelectorAll('input[name="choice"]:checked')].map(x=>x.value); else a.selected=[i.value];
      state.exam.answers[q.id]=a;
      document.querySelectorAll('[data-choice-row]').forEach(r=>r.classList.toggle('selected',a.selected.includes(r.dataset.choiceRow)));
    });
    const prev=document.querySelector('[data-exam-prev]'),next=document.querySelector('[data-exam-next]');
    if(prev) prev.onclick=()=>{state.exam.index--;render();}; if(next) next.onclick=()=>{state.exam.index++;render();};
    document.querySelectorAll('[data-exam-jump]').forEach(b=>b.onclick=()=>{state.exam.index=Number(b.dataset.examJump);render();});
    const mr=document.querySelector('[data-exam-review]'); if(mr) mr.onclick=()=>{const a=examAnswerFor(q.id);a.marked=!a.marked;render();};
    const f=document.querySelector('[data-finish-exam]'); if(f) f.onclick=()=>{if(confirm('Finish the mock exam and show the source answers?')) finishExam();};
  }

  function startExam(){
    const count=Math.max(1,Math.min(QUESTIONS.length,Number(document.getElementById('exam-count').value)||50));
    const mins=Math.max(5,Math.min(300,Number(document.getElementById('exam-minutes').value)||60));
    const topics=[...document.querySelectorAll('input[name="exam-topic"]:checked')].map(x=>Number(x.value));
    if(!topics.length){alert('Select at least one topic.');return;}
    let pool=QUESTIONS.filter(q=>topics.includes(q.topic)).map(q=>q.id);
    shuffle(pool); const ids=pool.slice(0,Math.min(count,pool.length));
    state.exam={ids,index:0,answers:{},remaining:mins*60,startedAt:Date.now(),finished:false,reviewIndex:null};
    ids.forEach(id=>examAnswerFor(id)); render();
  }
  function finishExam(){ state.exam.finished=true; state.exam.finishedAt=Date.now(); render(); }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function formatTime(sec){ sec=Math.max(0,sec); const m=Math.floor(sec/60),s=sec%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
  function startTimerLoop(){
    const tick=()=>{
      if(!state.exam || state.exam.finished) return;
      const elapsed=Math.floor((Date.now()-state.exam.startedAt)/1000);
      const initial = state.exam.remaining + elapsed; // remains stable only until first tick recalculation below
      if(!state.exam.initialSeconds) state.exam.initialSeconds=state.exam.remaining;
      state.exam.remaining=Math.max(0,state.exam.initialSeconds-elapsed);
      const el=document.getElementById('timer'); if(el)el.textContent=formatTime(state.exam.remaining);
      if(state.exam.remaining<=0){ state.exam.finished=true; render(); }
    };
    tick(); state.timerHandle=setInterval(tick,1000);
  }

  function bindReview(){
    document.querySelectorAll('[data-review-tab]').forEach(b=>b.onclick=()=>{state.reviewTab=b.dataset.reviewTab;render();});
    document.querySelectorAll('[data-review-open]').forEach(b=>b.onclick=()=>{
      const id=Number(b.dataset.reviewOpen), q=QUESTIONS[id-1];
      state.practice.topic='all';state.practice.status='all';state.practice.search='';state.practice.ids=QUESTIONS.map(q=>q.id);state.practice.index=id-1;resetPracticeQuestion();state.view='practice';render();
    });
  }

  function openModal(src){
    const root=document.getElementById('modal-root'); root.innerHTML=`<div class="modal" id="img-modal"><button aria-label="Close">×</button><img src="${src}"></div>`;
    root.querySelector('button').onclick=()=>root.innerHTML=''; root.querySelector('.modal').onclick=e=>{if(e.target.classList.contains('modal'))root.innerHTML='';};
  }

  render();
})();
