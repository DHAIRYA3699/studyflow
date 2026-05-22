function uid(){ return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
const storageKey='studyflow_rebuilt_final_v3';
const authKey='studyflow_auth_rebuilt_v3';
/** Paste your OpenRouter key here: https://openrouter.ai/keys — or use localStorage key studyflow_openrouter_api */
const OPENROUTER_API_KEY='';
function getOpenRouterApiKey(){
  return (state.settings?.openRouterApiKey||localStorage.getItem('studyflow_openrouter_api')||OPENROUTER_API_KEY||'').trim();
}
function syncApiKeyStorage(){
  const key=getOpenRouterApiKey();
  if(key) localStorage.setItem('studyflow_openrouter_api',key);
  else localStorage.removeItem('studyflow_openrouter_api');
}
function updateApiKeyStatus(){
  const el=qs('apiKeyStatus');
  if(!el) return;
  el.textContent=getOpenRouterApiKey() ? 'API key saved locally. Use the ✦ button (bottom-right) to chat.' : 'No API key yet — add one above to enable the floating AI chat.';
}
const defaultState={
  settings:{toasts:true,autosave:true,profileName:'',accent:'#2563eb',openRouterApiKey:''},
  tasks:[
   
  ],
  notes:[],
  calendarDate:new Date().toISOString(),
  timerSeconds:1500,timerRunning:false,timerMode:1500,focusSessions:[],
  timetable:[],
  grades:[],
  habits:[],
  flashcards:[],
  exams:[],
  goals:[],
  ui:{selectedDeck:'DBMS',flashIndex:0,flashFlipped:false}
};
let state=loadState();
normalizeStateArrays();
let timerInterval=null;
let calendarCursor=new Date(state.calendarDate || new Date().toISOString());
let priorityChart=null,gradeChart=null;
let saveTimer=null;
let profileSaveTimer=null;
let sessionLoggedIn=false;
let lastPage=null;
let splashTimers=[];
const MAX_CHAT_HISTORY=20;

function flushSave(){
  clearTimeout(saveTimer);
  saveTimer=null;
  if(state.settings?.autosave===false) return;
  localStorage.setItem(storageKey,JSON.stringify(state));
}
function scheduleSave(){
  if(state.settings?.autosave===false) return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(flushSave,300);
}
function saveState(immediate=false){
  if(state.settings?.autosave===false) return;
  if(immediate) flushSave();
  else scheduleSave();
}
function capHistory(arr){
  while(arr.length>MAX_CHAT_HISTORY) arr.shift();
}
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function mergeState(base,incoming){
  const merged=clone(base);
  Object.keys(merged).forEach(key=>{
    if(Array.isArray(merged[key])) merged[key]=Array.isArray(incoming?.[key]) ? incoming[key] : merged[key];
    else if(typeof merged[key]==='object' && merged[key]!==null) merged[key]={...merged[key],...(incoming?.[key]||{})};
    else if(incoming && key in incoming) merged[key]=incoming[key];
  });
  return merged;
}
function loadState(){ try{ const raw=localStorage.getItem(storageKey); return raw ? mergeState(defaultState,JSON.parse(raw)) : clone(defaultState); }catch(e){ return clone(defaultState); } }
function normalizeStateArrays(){
  ['tasks','notes','exams','goals','grades','habits','flashcards','timetable','focusSessions'].forEach(k=>{
    if(!Array.isArray(state[k])) state[k]=[];
  });
  if(!state.ui || typeof state.ui!=='object') state.ui=clone(defaultState.ui);
  if(!state.settings || typeof state.settings!=='object') state.settings=clone(defaultState.settings);
  if(typeof state.settings.openRouterApiKey!=='string'){
    state.settings.openRouterApiKey=localStorage.getItem('studyflow_openrouter_api')||'';
  }
}
function loadAuth(){ try{ return JSON.parse(localStorage.getItem(authKey)||'null'); }catch(e){ return null; } }
function saveAuth(data){ localStorage.setItem(authKey,JSON.stringify(data)); }
function clearAuth(){ localStorage.removeItem(authKey); }
const usersKey = 'studyflow_users';

function loadUsers(){
  try{
    return JSON.parse(localStorage.getItem(usersKey)) || [];
  }catch{
    return [];
  }
}

function saveUsers(users){
  localStorage.setItem(usersKey, JSON.stringify(users));
}
function qs(id){ return document.getElementById(id); }
function escapeHtml(str=''){ return String(str).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function toast(msg){ if(state.settings?.toasts===false) return; const el=qs('toast'); if(!el) return; el.textContent=msg; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove('show'),1800); }
function localDateKey(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function daysLeft(dateStr){ const today=new Date(); today.setHours(0,0,0,0); const d=new Date(dateStr+'T00:00:00'); return Math.ceil((d-today)/86400000); }
function formatDate(dateStr){ if(!dateStr) return 'No due date'; return new Date(dateStr+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
function shadeHexColor(hex,percent){ const clean=String(hex).replace('#',''); const full=clean.length===3 ? clean.split('').map(c=>c+c).join('') : clean; const num=parseInt(full,16); const amt=Math.round(2.55*percent); const r=Math.max(0,Math.min(255,(num>>16)+amt)); const g=Math.max(0,Math.min(255,((num>>8)&255)+amt)); const b=Math.max(0,Math.min(255,(num&255)+amt)); return '#' + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1); }
function applyAccentColor(color){ const accent=color || '#2563eb'; document.documentElement.style.setProperty('--primary',accent); document.documentElement.style.setProperty('--primary-2',shadeHexColor(accent,-10)); document.documentElement.style.setProperty('--primary-soft',shadeHexColor(accent,38)); }
function getTimeStartLabel(time=''){ const match=String(time).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if(!match) return ''; let hour=Number(match[1]); const minute=(match[2]||'00').padStart(2,'0'); const suffix=(match[3]||'').toLowerCase(); if(suffix==='pm' && hour<12) hour+=12; if(suffix==='am' && hour===12) hour=0; return `${hour}:${minute}`; }

function clearSplashTimers(){
  splashTimers.forEach(id=>clearTimeout(id));
  splashTimers=[];
}
function renderAuth(){
  const auth=loadAuth();
  if(auth?.loggedIn){
    sessionLoggedIn=true;
    qs('authRoot').innerHTML='';
    qs('appRoot').classList.remove('hidden');
    if(qs('todayDatePill')) qs('todayDatePill').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
    if(qs('welcomeChip')) qs('welcomeChip').textContent='Welcome, '+(state.settings.profileName || auth.name || 'Student');
    if(!state.settings.profileName && auth.name){ state.settings.profileName=auth.name; saveState(true); }
    return;
  }
  sessionLoggedIn=false;
  destroyCharts();
  pauseTimer();
  qs('appRoot').classList.add('hidden');
  qs('authRoot').innerHTML=`
  <section class="auth-shell">
    <div class="auth-left">
      <div class="auth-copy">
        <div class="auth-badge">Academic Productivity Platform</div>
        <div style="height:18px"></div>
        <div class="hero-brand"><div class="hero-mark">📘</div>Study<span>Flow</span></div>
        <div style="height:14px"></div>
        <h1 class="auth-hero-title">Manage study planning, deadlines, and performance in one dashboard.</h1>
        <p class="auth-hero-text">A clean academic management interface for organizing tasks, notes, revision, class schedules, and exam preparation with a professional presentation-ready design.</p>
        <div style="height:22px"></div>
        <div class="auth-chip-row">
          <span class="auth-chip">Task Planning</span>
          <span class="auth-chip">Grade Tracking</span>
          <span class="auth-chip">Focus Sessions</span>
          <span class="auth-chip">Exam Countdown</span>
        </div>
        <div style="height:24px"></div>
        <div class="auth-metrics">
          <div class="auth-metric"><strong>8+</strong><span class="muted">Integrated academic modules</span></div>
          <div class="auth-metric"><strong>Smart</strong><span class="muted">Browser-based data persistence</span></div>
          <div class="auth-metric"><strong>Secure</strong><span class="muted">Simple login and guest access flow</span></div>
        </div>
      </div>
    </div>
    <div class="auth-right">
      <div class="card auth-panel">
        <div class="auth-card-top">
          <h2 class="auth-title">Student Productivity Dashboard</h2>
          <p class="auth-subtitle">Sign in to continue to your workspace or use guest access for overview</p>
          <div class="auth-switch">
            <button type="button" class="btn small primary authTab active" data-auth="login">Login</button>
            <button type="button" class="btn small ghost authTab" data-auth="signup">Sign Up</button>
            <button type="button" class="btn small ghost authTab" data-auth="guest">Guest</button>
          </div>
        </div>
        <div class="auth-card-body">
          <div id="authPanels">
            <div class="authPane" id="loginPane">
              <h2>Welcome back</h2>
              <p>Login to access your dashboard and saved study data.</p>
              <div class="input-wrap"><label class="field-label" for="loginName">Name</label><input class="input" id="loginName" placeholder="Enter your name" /></div>
              <div class="input-wrap"><label class="field-label" for="loginEmail">Email</label><input class="input" id="loginEmail" placeholder="Enter your email" type="email" /></div>
              <div class="input-wrap"><label class="field-label" for="loginPassword">Password</label><input class="input" id="loginPassword" placeholder="Enter your password" type="password" /></div>
              <div class="auth-actions">
                <button type="button" class="btn primary" id="loginBtn" style="width:100%">Login to Dashboard</button>
                <div class="auth-help">Use any valid email and password for project demonstration.</div>
              </div>
            </div>
            <div class="authPane hidden" id="signupPane">
              <h2>Create account</h2>
              <p>Create a profile to personalize your dashboard experience.</p>
              <div class="input-wrap"><label class="field-label" for="signupName">Full name</label><input class="input" id="signupName" placeholder="Enter full name" /></div>
              <div class="input-wrap"><label class="field-label" for="signupEmail">Email</label><input class="input" id="signupEmail" placeholder="Enter your email" type="email" /></div>
              <div class="input-wrap"><label class="field-label" for="signupPassword">Password</label><input class="input" id="signupPassword" placeholder="Create a password" type="password" /></div>
              <div class="auth-actions">
                <button type="button" class="btn primary" id="signupBtn" style="width:100%">Create Account</button>
                <div class="auth-help">Create your account to access the application</div>
              </div>
            </div>
            <div class="authPane hidden" id="guestPane">
              <h2>Continue as guest</h2>
              <p>Quick access mode for testing and experience</p>
              <div class="input-wrap"><label class="field-label" for="guestName">Display name</label><input class="input" id="guestName" placeholder="Enter display name" value="Guest Student" /></div>
              <div class="auth-actions">
                <button type="button" class="btn primary" id="guestBtn" style="width:100%">Enter Dashboard</button>
                <div class="auth-help">Useful when presenting the interface directly to a teacher or examiner.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  document.querySelectorAll('.authTab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.authTab').forEach(b=>{ b.classList.remove('primary','active'); b.classList.add('ghost'); });
    btn.classList.add('primary','active'); btn.classList.remove('ghost');
    document.querySelectorAll('.authPane').forEach(p=>p.classList.add('hidden'));
    qs(btn.dataset.auth+'Pane').classList.remove('hidden');
  }));

 const completeLogin=(name,email)=>{
    startDashboardTransition(name,email);
};

  qs('loginBtn').onclick = () => {

  const email = qs('loginEmail').value.trim();
  const password = qs('loginPassword').value.trim();

  if(!email || !password){
    return toast('Enter email and password');
  }

  const users = loadUsers();

  const user = users.find(u =>
    u.email === email &&
    u.password === password
  );

  if(!user){
    return toast('Invalid email or password');
  }

  completeLogin(user.name, user.email);
};
  qs('loginPassword').addEventListener('keydown',e=>{ if(e.key==='Enter') qs('loginBtn').click(); });
  qs('signupBtn').onclick = () => {

  const name = qs('signupName').value.trim();
  const email = qs('signupEmail').value.trim();
  const password = qs('signupPassword').value.trim();

  if(!name || !email || !password){
    return toast('Fill all sign up fields');
  }

  const users = loadUsers();

  const existingUser = users.find(u => u.email === email);

  if(existingUser){
    return toast('Account already exists');
  }

  users.push({
    id: uid(),
    name,
    email,
    password
  });

  saveUsers(users);

  toast('Account created successfully');

  completeLogin(name, email);
};
  qs('guestBtn').onclick=()=>{
    const name=qs('guestName').value.trim() || 'Guest Student';
    completeLogin(name,'guest@demo.local');
  };
}
function startDashboardTransition(name,email){
    const splash=document.getElementById('splashScreen');
    clearSplashTimers();
    splash.classList.remove('hidden');
    saveAuth({loggedIn:true,name,email});
    state.settings.profileName=name;
    saveState(true);
    splashTimers.push(setTimeout(()=>{
        renderAuth();
        bindDelegatedEvents();
        renderAll();
        switchPage('dashboard');
        splash.classList.add('fade-out');
        splashTimers.push(setTimeout(()=>{
            splash.classList.add('hidden');
            splash.classList.remove('fade-out');
        },800));
    },2500));
}

function openConfirmModal(title,message,onConfirm){
  closeConfirmModal();
  const wrap=document.createElement('div');
  wrap.className='modal-backdrop';
  wrap.id='confirmModal';
  wrap.innerHTML=`<div class="modal"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p><div class="modal-actions"><button class="btn ghost" id="modalCancelBtn">Cancel</button><button class="btn danger" id="modalConfirmBtn">Confirm</button></div></div>`;
  document.body.appendChild(wrap);
  qs('modalCancelBtn').onclick=closeConfirmModal;
  qs('modalConfirmBtn').onclick=()=>{ onConfirm(); };
}
function closeConfirmModal(){ const modal=qs('confirmModal'); if(modal) modal.remove(); }

function destroyCharts(){
  if(priorityChart){ priorityChart.destroy(); priorityChart=null; }
  if(gradeChart){ gradeChart.destroy(); gradeChart=null; }
  document.querySelectorAll('.chart-unavailable').forEach(el=>el.remove());
  ['priorityChart','gradeChart'].forEach(id=>{
    const c=qs(id);
    if(c) c.style.display='';
  });
}
function showChartUnavailable(canvas,title,message){
  if(!canvas) return;
  const wrap=canvas.parentElement;
  if(!wrap) return;
  canvas.style.display='none';
  let el=wrap.querySelector('.chart-unavailable');
  if(!el){
    el=document.createElement('div');
    el.className='empty chart-unavailable';
    wrap.appendChild(el);
  }
  el.innerHTML=`<strong>${escapeHtml(title)}</strong>${escapeHtml(message)}`;
}
function switchPage(name){
  if(lastPage==='analytics' && name!=='analytics') destroyCharts();
  lastPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
  const page=qs(name+'Page');
  const navBtn=document.querySelector(`.nav button[data-page="${name}"]`);
  if(page) page.classList.remove('hidden');
  if(navBtn) navBtn.classList.add('active');
  const map={
    dashboard:['Dashboard','Plan tasks, track progress, and organize academic work.'],
    tasks:['Tasks','Create, update, search, and complete academic tasks.'],
    notes:['Notes','Store and manage important study notes.'],
    calendar:['Calendar','View deadlines and important academic dates.'],
    focus:['Focus','Track focused study sessions with a timer.'],
    analytics:['Analytics','Review performance and progress across modules.'],
    timetable:['Timetable','Organize weekly subjects and class timings.'],
    grades:['Grades','Track marks and view academic summary.'],
    habits:['Habits','Maintain productive study habits consistently.'],
    flashcards:['Flashcards','Create decks and revise important topics.'],
    exams:['Exam Countdown','Monitor upcoming exams and deadlines.'],
    goals:['Goals','Track academic targets and completion progress.'],
    settings:['Settings','Manage profile and dashboard preferences.']
  };
  qs('pageTitle').textContent=map[name][0];
  qs('pageSubtitle').textContent=map[name][1];
  if(name==='analytics') renderCharts();
}

function bindStaticEvents(){
  if(window.__studyflowBound) return;
  window.__studyflowBound=true;
  document.querySelectorAll('.nav button').forEach(btn=>btn.onclick=()=>switchPage(btn.dataset.page));
  qs('sidebarNewTaskBtn').onclick=()=>switchPage('tasks');
  qs('logoutBtn').onclick=()=>openConfirmModal('Logout','Are you sure you want to logout from the dashboard?',()=>{ pauseTimer(); flushSave(); clearSplashTimers(); resetAiChats(); clearAuth(); closeConfirmModal(); renderAuth(); });
  qs('resetAllBtn').onclick=()=>openConfirmModal('Reset Data','This will remove all tasks, notes, exams, and other dashboard data. AI chat history will be cleared. Your API key in Settings is kept.',()=>{ pauseTimer(); const savedApiKey=getOpenRouterApiKey(); state=clone(defaultState); state.settings.openRouterApiKey=savedApiKey; normalizeStateArrays(); syncApiKeyStorage(); calendarCursor=new Date(state.calendarDate || new Date().toISOString()); saveState(true); resetAiChats(); renderAll(); switchPage('dashboard'); closeConfirmModal(); toast('Data reset successfully'); });
  qs('exportBtn').onclick=()=>{ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='studyflow-data.json'; a.click(); URL.revokeObjectURL(a.href); };
  qs('importFile').onchange=e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const imported=JSON.parse(reader.result); state=mergeState(defaultState,imported); normalizeStateArrays(); syncApiKeyStorage(); calendarCursor=new Date(state.calendarDate || new Date().toISOString()); saveState(true); resetAiChats(); renderAll(); toast('Data imported'); }catch(err){ toast('Invalid JSON file'); } }; reader.readAsText(file); e.target.value=''; };

  qs('addTaskBtn').onclick=()=>{ const title=qs('taskTitle').value.trim(); const desc=qs('taskDesc').value.trim(); const due=qs('taskDue').value; const priority=qs('taskPriority').value; if(!title) return toast('Enter task title'); state.tasks.unshift({id:uid(),title,desc,due,priority,done:false}); qs('taskTitle').value=''; qs('taskDesc').value=''; qs('taskDue').value=''; qs('taskPriority').value='medium'; saveState(true); renderSections('stats','dashboard','tasks','calendar'); toast('Task added'); };
  qs('taskFilter').onchange=renderTasks; qs('taskSearch').oninput=renderTasks;
  qs('addNoteBtn').onclick=()=>{ addNote(qs('noteTitle').value,qs('noteBody').value); qs('noteTitle').value=''; qs('noteBody').value=''; };
  qs('quickAddNoteBtn').onclick=()=>{ addNote(qs('quickNoteTitle').value,qs('quickNoteBody').value); qs('quickNoteTitle').value=''; qs('quickNoteBody').value=''; };
  qs('noteSearch').oninput=renderNotes;
  qs('prevMonthBtn').onclick=()=>{ calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(); };
  qs('nextMonthBtn').onclick=()=>{ calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(); };
  qs('startTimerBtn').onclick=startTimer;
  qs('pauseTimerBtn').onclick=()=>{ pauseTimer(); toast('Timer paused'); };
  qs('resetTimerBtn').onclick=()=>{ resetTimer(); toast('Timer reset'); };
  document.querySelectorAll('.modeBtn').forEach(btn=>btn.onclick=()=>{ pauseTimer(); document.querySelectorAll('.modeBtn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); state.timerMode=Number(btn.dataset.mode); state.timerSeconds=state.timerMode; state.timerRunning=false; saveState(true); renderSections('timer','stats'); });
  qs('addGradeBtn').onclick=()=>{ const subject=qs('gradeSubject').value.trim(); const score=Number(qs('gradeScore').value); const credits=Number(qs('gradeCredits').value); if(!subject||Number.isNaN(score)||Number.isNaN(credits)) return toast('Fill all grade fields'); state.grades.unshift({id:uid(),subject,score,credits}); qs('gradeSubject').value=''; qs('gradeScore').value=''; qs('gradeCredits').value=''; saveState(true); renderSections('grades','analytics'); if(lastPage==='analytics') renderCharts(); toast('Grade added'); };
  qs('addHabitBtn').onclick=()=>{ const name=qs('habitName').value.trim(); const icon=qs('habitIcon').value.trim()||'✅'; const target=Number(qs('habitTarget').value)||1; if(!name) return toast('Enter habit name'); state.habits.unshift({id:uid(),name,icon,target,days:[false,false,false,false,false,false,false]}); qs('habitName').value=''; qs('habitIcon').value=''; qs('habitTarget').value=''; saveState(true); renderSections('habits','analytics'); toast('Habit added'); };
  qs('addFlashBtn').onclick=()=>{ const deck=qs('deckName').value.trim(); const question=qs('cardQuestion').value.trim(); const answer=qs('cardAnswer').value.trim(); if(!deck||!question||!answer) return toast('Fill all flashcard fields'); state.flashcards.unshift({id:uid(),deck,question,answer}); state.ui.selectedDeck=deck; state.ui.flashIndex=0; state.ui.flashFlipped=false; qs('deckName').value=''; qs('cardQuestion').value=''; qs('cardAnswer').value=''; saveState(true); renderSections('flashcards'); toast('Flashcard added'); };
  qs('flipFlashBtn').onclick=()=>{ state.ui.flashFlipped=!state.ui.flashFlipped; renderFlashcards(); };
  qs('prevFlashBtn').onclick=()=>{ const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); if(!cards.length) return; state.ui.flashIndex=(state.ui.flashIndex-1+cards.length)%cards.length; state.ui.flashFlipped=false; renderFlashcards(); };
  qs('nextFlashBtn').onclick=()=>{ const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); if(!cards.length) return; state.ui.flashIndex=(state.ui.flashIndex+1)%cards.length; state.ui.flashFlipped=false; renderFlashcards(); };
  qs('flashCard').onclick=()=>qs('flipFlashBtn').click();
  qs('addExamBtn').onclick=()=>{ const name=qs('examName').value.trim(); const date=qs('examDate').value; const subject=qs('examSubject').value.trim(); if(!name||!date||!subject) return toast('Fill all exam fields'); if(!Array.isArray(state.exams)) state.exams=[]; state.exams.unshift({id:uid(),name,date,subject}); qs('examName').value=''; qs('examDate').value=''; qs('examSubject').value=''; saveState(true); renderSections('stats','dashboard','exams','calendar'); toast('Exam added'); };
  qs('addGoalBtn').onclick=()=>{ const title=qs('goalTitle').value.trim(); const target=Number(qs('goalTarget').value)||100; const progress=Number(qs('goalProgressInput').value)||0; if(!title) return toast('Enter goal title'); state.goals.unshift({id:uid(),title,target,progress}); qs('goalTitle').value=''; qs('goalTarget').value=''; qs('goalProgressInput').value=''; saveState(true); renderSections('stats','dashboard','goals'); toast('Goal added'); };
  qs('addTtBtn').onclick=()=>{ const name=qs('ttName').value.trim(); const day=qs('ttDay').value; const time=qs('ttTime').value.trim(); const color=qs('ttColor').value; if(!name||!time) return toast('Fill timetable fields'); state.timetable.unshift({id:uid(),name,day,time,color}); qs('ttName').value=''; qs('ttTime').value=''; saveState(true); renderSections('timetable'); toast('Class added'); };
  qs('toggleToast').onclick=()=>{ state.settings.toasts=!state.settings.toasts; saveState(true); renderSettings(); };
  qs('toggleAutosave').onclick=()=>{ state.settings.autosave=!state.settings.autosave; if(state.settings.autosave) saveState(true); renderSettings(); };
  qs('profileName').oninput=e=>{
    state.settings.profileName=e.target.value;
    if(qs('welcomeChip')) qs('welcomeChip').textContent='Welcome, '+(e.target.value||'Student');
    clearTimeout(profileSaveTimer);
    profileSaveTimer=setTimeout(()=>saveState(),400);
  };
  qs('accentColor').oninput=e=>{ state.settings.accent=e.target.value; applyAccentColor(e.target.value); saveState(); };
  const apiInput=qs('openRouterApiKey');
  if(apiInput){
    apiInput.oninput=e=>{
      state.settings.openRouterApiKey=e.target.value.trim();
      syncApiKeyStorage();
      saveState();
      updateApiKeyStatus();
    };
  }
  document.querySelectorAll('.settingsTab').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.settingsTab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.settingsPane').forEach(p=>p.classList.add('hide')); qs('settings-'+btn.dataset.tab).classList.remove('hide'); });
  bindThemeToggles();
  bindDelegatedEvents();
  window.addEventListener('beforeunload',()=>{ pauseTimer(); flushSave(); });
  window.addEventListener('pagehide',()=>{ pauseTimer(); flushSave(); });
}

function updateThemeToggleUi(){
  const dark=document.body.classList.contains('dark');
  const top=qs('themeToggle');
  if(top) top.textContent=dark?'☀️':'🌙';
  const settingsBtn=qs('themeToggleSettings');
  if(settingsBtn) settingsBtn.textContent=dark?'☀️ Light':'🌙 Dark';
}
function bindThemeToggles(){
  document.querySelectorAll('.js-theme-toggle, #themeToggle').forEach(btn=>{
    if(btn.__themeBound) return;
    btn.__themeBound=true;
    btn.onclick=()=>{
      document.body.classList.toggle('dark');
      const dark=document.body.classList.contains('dark');
      localStorage.setItem('theme',dark?'dark':'light');
      updateThemeToggleUi();
      if(lastPage==='analytics') renderCharts();
    };
  });
  updateThemeToggleUi();
}

function bindDelegatedEvents(){
  if(window.__studyflowDelegated) return;
  window.__studyflowDelegated=true;
  const app=qs('appRoot');
  if(!app) return;

  app.addEventListener('change',e=>{
    if(e.target.matches('#taskList .check')){
      const row=e.target.closest('.task[data-id]');
      if(row) toggleTask(row.dataset.id);
    }
  });
  app.addEventListener('click',e=>{
    const del=e.target.closest('[data-action="delete"]');
    if(del){
      const row=del.closest('.task[data-id],.note[data-id],.grade[data-id],.habit[data-id],.flash[data-id],.exam[data-id],.goal[data-id],.tt-item[data-id]');
      if(!row?.dataset.id) return;
      const id=row.dataset.id;
      if(row.classList.contains('task')) deleteTask(id);
      else if(row.classList.contains('note')) deleteNote(id);
      else if(row.classList.contains('grade')) deleteGrade(id);
      else if(row.classList.contains('habit')) deleteHabit(id);
      else if(row.classList.contains('flash')) deleteFlash(id);
      else if(row.classList.contains('exam')) deleteExam(id);
      else if(row.classList.contains('goal')) deleteGoal(id);
      else if(row.classList.contains('tt-item')) deleteTt(id);
      return;
    }
    const bump=e.target.closest('[data-action="bump"]');
    if(bump){
      const row=bump.closest('.goal[data-id]');
      if(row) bumpGoal(row.dataset.id,Number(bump.dataset.bump)||10);
      return;
    }
    const wd=e.target.closest('.wd[data-habit][data-day]');
    if(wd){
      toggleHabitDay(wd.dataset.habit,Number(wd.dataset.day));
      return;
    }
    const folder=e.target.closest('#deckFolders .folder[data-deck]');
    if(folder){
      selectDeck(decodeURIComponent(folder.getAttribute('data-deck')||''));
    }
  });
}

const RENDERERS={
  stats:()=>renderStats(),
  dashboard:()=>renderDashboard(),
  tasks:()=>renderTasks(),
  notes:()=>renderNotes(),
  calendar:()=>renderCalendar(),
  timer:()=>renderTimer(),
  focusLog:()=>renderFocusLog(),
  grades:()=>renderGrades(),
  habits:()=>renderHabits(),
  flashcards:()=>renderFlashcards(),
  exams:()=>renderExams(),
  goals:()=>renderGoals(),
  timetable:()=>renderTimetable(),
  analytics:()=>renderAnalytics(),
  settings:()=>renderSettings()
};
function renderSections(...keys){
  if(!sessionLoggedIn) return;
  keys.forEach(k=>{
    try{ RENDERERS[k]?.(); }
    catch(err){ console.error('StudyFlow render error:',k,err); }
  });
}

function renderStats(){
  const tasks=Array.isArray(state.tasks)?state.tasks:[];
  const notes=Array.isArray(state.notes)?state.notes:[];
  const exams=Array.isArray(state.exams)?state.exams:[];
  const goals=Array.isArray(state.goals)?state.goals:[];
  const total=tasks.length;
  const done=tasks.filter(t=>t.done).length;
  const progress=total?Math.round(done/total*100):0;
  const set=(id,val)=>{ const el=qs(id); if(el) el.textContent=val; };
  set('statTotal',total);
  set('statDone',done);
  set('statNotes',notes.length);
  set('statProgress',progress+'%');
  set('dashTaskChip',(total-done)+' pending');
  set('todayPendingCount',total-done);
  set('todayExamCount',exams.length);
  set('todayGoalCount',goals.filter(g=>g.progress<100).length);
  set('focusStatusPill',state.timerRunning?'Focus timer running':'Focus timer ready');
  set('todayDatePill',new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'}));
  set('navTaskCount',total-done);
  const semester=Math.max(0,Math.min(100,progress+Math.min(40,goals.reduce((a,g)=>a+(g.progress||0),0)/(goals.length||1)/3)));
  set('semesterProgressLabel',Math.round(semester)+'%');
  const bar=qs('semesterProgressBar');
  if(bar) bar.style.width=Math.round(semester)+'%';
}
function renderDashboard(){
  const recent=[...state.tasks].slice(0,5);
  qs('dashboardTasks').innerHTML=recent.length ? recent.map(t=>`<div class="note"><div><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.desc||'No description')}</p><div class="muted">Due: ${escapeHtml(formatDate(t.due))}</div></div></div>`).join('') : '<div class="empty"><strong>No recent tasks</strong>Add a task to begin tracking your academic work.</div>';
  const exams=[...state.exams].sort((a,b)=>daysLeft(a.date)-daysLeft(b.date)).slice(0,3);
  qs('dashboardExams').innerHTML=exams.length ? exams.map(e=>`<div class="note"><div><h3>${escapeHtml(e.name)}</h3><p>${escapeHtml(e.subject)} • ${daysLeft(e.date)} day(s) left</p></div></div>`).join('') : '<div class="empty"><strong>No upcoming exams</strong>Add an exam date to view countdowns here.</div>';
}
function renderTasks(){
  const filter=qs('taskFilter').value;
  const q=qs('taskSearch').value.trim().toLowerCase();
  let tasks=[...state.tasks];
  if(filter==='pending') tasks=tasks.filter(t=>!t.done);
  if(filter==='completed') tasks=tasks.filter(t=>t.done);
  if(filter==='high') tasks=tasks.filter(t=>t.priority==='high');
  if(q) tasks=tasks.filter(t=>t.title.toLowerCase().includes(q)||(t.desc||'').toLowerCase().includes(q));
  qs('taskList').innerHTML=!tasks.length ? '<div class="empty"><strong>No tasks found</strong>Try a different filter or add a new task.</div>' : tasks.map(t=>`<div class="task ${t.done?'done':''}" data-id="${t.id}"><input class="check" type="checkbox" ${t.done?'checked':''}><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${escapeHtml(t.desc||'No description')} • Due: ${escapeHtml(formatDate(t.due))} • <span class="pill p-${t.priority}">${t.priority}</span></div></div><div class="task-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('');
}
function toggleTask(id){ const t=state.tasks.find(x=>x.id===id); if(!t) return; t.done=!t.done; saveState(); renderSections('stats','dashboard','tasks'); toast(t.done?'Task completed':'Task marked pending'); }
window.toggleTask=toggleTask;
function deleteTask(id){ state.tasks=state.tasks.filter(t=>t.id!==id); saveState(); renderSections('stats','dashboard','tasks','calendar'); toast('Task deleted'); }
window.deleteTask=deleteTask;
function addNote(title,body){ if(!title.trim()) return toast('Enter note title'); state.notes.unshift({id:uid(),title:title.trim(),body:body.trim(),createdAt:Date.now()}); saveState(true); renderSections('stats','notes'); toast('Note saved'); }
function renderNotes(){ const q=qs('noteSearch').value.trim().toLowerCase(); const notes=state.notes.filter(n=>!q || n.title.toLowerCase().includes(q) || (n.body||'').toLowerCase().includes(q)); qs('noteList').innerHTML=!notes.length ? '<div class="empty"><strong>No notes found</strong>Create a note or change your search.</div>' : notes.map(n=>`<div class="note" data-id="${n.id}"><div class="row between"><div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p><div class="muted" style="margin-top:8px;font-size:12px;">${new Date(n.createdAt).toLocaleString()}</div></div><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join(''); }
function deleteNote(id){ state.notes=state.notes.filter(n=>n.id!==id); saveState(); renderSections('stats','notes'); toast('Note deleted'); }
window.deleteNote=deleteNote;
function renderCalendar(){
  state.calendarDate=calendarCursor.toISOString();
  scheduleSave();
  qs('monthLabel').textContent=calendarCursor.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const first=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);
  const last=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,0);
  const startDay=first.getDay();
  const totalCells=Math.ceil((startDay+last.getDate())/7)*7;
  const todayKey=localDateKey(new Date());
  let html=names.map(n=>`<div class="dayhead">${n}</div>`).join('');
  for(let i=0;i<totalCells;i++){
    const dayNum=i-startDay+1;
    if(dayNum<1||dayNum>last.getDate()){ html+='<div class="day"></div>'; continue; }
    const d=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),dayNum);
    const key=localDateKey(d);
    const count=state.tasks.filter(t=>t.due===key).length+state.exams.filter(e=>e.date===key).length;
    const isToday=key===todayKey;
    html+=`<div class="day ${isToday?'today':''}">${dayNum}${count?`<span class="count">${count} item${count>1?'s':''}</span>`:''}</div>`;
  }
  qs('calendarGrid').innerHTML=html;
}
function renderTimer(){ const m=String(Math.floor(state.timerSeconds/60)).padStart(2,'0'); const s=String(state.timerSeconds%60).padStart(2,'0'); qs('timerDisplay').textContent=`${m}:${s}`; document.querySelectorAll('.modeBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.mode)===state.timerMode)); }
function startTimer(){ if(timerInterval) return; state.timerRunning=true; saveState(true); renderSections('stats'); timerInterval=setInterval(()=>{ if(state.timerSeconds>0){ state.timerSeconds--; renderTimer(); renderSections('stats'); } else { clearInterval(timerInterval); timerInterval=null; state.timerRunning=false; state.focusSessions.unshift({id:uid(),at:Date.now(),mode:state.timerMode}); state.timerSeconds=state.timerMode; saveState(true); renderSections('timer','focusLog','stats'); toast('Focus session complete'); } },1000); }
function pauseTimer(){ clearInterval(timerInterval); timerInterval=null; state.timerRunning=false; saveState(true); renderSections('stats'); }
function resetTimer(){ pauseTimer(); state.timerSeconds=state.timerMode; saveState(true); renderSections('timer'); }
function renderFocusLog(){ qs('focusLog').innerHTML=state.focusSessions.length ? state.focusSessions.slice(0,8).map(s=>`<div class="note"><div><h3>${s.mode===1500?'Focus':s.mode===300?'Short Break':'Long Break'}</h3><p>${new Date(s.at).toLocaleString()}</p></div></div>`).join('') : '<div class="empty"><strong>No sessions completed</strong>Your completed focus sessions will appear here.</div>'; }
function renderGrades(){ qs('gradeList').innerHTML=state.grades.length ? state.grades.map(g=>`<div class="grade" data-id="${g.id}"><div><div class="item-title">${escapeHtml(g.subject)}</div><div class="item-meta">Score: ${g.score} • Credits: ${g.credits}</div></div><div><span class="pill ${g.score>=80?'p-low':g.score>=60?'p-medium':'p-high'}">${g.score}</span></div><div class="item-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No grades added</strong>Add subject scores to see your summary.</div>'; const avg=state.grades.length?(state.grades.reduce((a,b)=>a+b.score,0)/state.grades.length):0; qs('gpaBox').textContent=Math.min(10,avg/10).toFixed(2); }
function deleteGrade(id){ state.grades=state.grades.filter(g=>g.id!==id); saveState(); renderSections('grades','analytics'); if(lastPage==='analytics') renderCharts(); toast('Grade deleted'); }
window.deleteGrade=deleteGrade;
function renderHabits(){ qs('habitList').innerHTML=state.habits.length ? state.habits.map(h=>`<div class="habit" data-id="${h.id}"><div>${escapeHtml(h.icon||'✅')}</div><div><div class="item-title">${escapeHtml(h.name)}</div><div class="item-meta">Target ${h.target}/week</div><div class="week">${['S','M','T','W','T','F','S'].map((d,i)=>`<div class="wd ${h.days[i]?'done':''}" data-habit="${h.id}" data-day="${i}" role="button" tabindex="0">${d}</div>`).join('')}</div></div><div class="item-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No habits added</strong>Create a habit to begin tracking consistency.</div>'; }
function toggleHabitDay(id,i){ const h=state.habits.find(x=>x.id===id); if(!h) return; h.days[i]=!h.days[i]; saveState(); renderSections('habits','analytics'); }
window.toggleHabitDay=toggleHabitDay;
function deleteHabit(id){ state.habits=state.habits.filter(h=>h.id!==id); saveState(); renderSections('habits','analytics'); toast('Habit deleted'); }
window.deleteHabit=deleteHabit;
function renderFlashcards(){ const decks=[...new Set(state.flashcards.map(f=>f.deck))]; qs('deckFolders').innerHTML=decks.map(d=>`<div class="folder ${state.ui.selectedDeck===d?'active':''}" data-deck="${encodeURIComponent(d)}">${escapeHtml(d)}</div>`).join(''); const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); qs('flashCount').textContent=cards.length+' cards'; if(!cards.length){ qs('flashCard').textContent='No cards in this deck'; qs('flashList').innerHTML='<div class="empty"><strong>No flashcards found</strong>Create cards to begin studying this deck.</div>'; return; } if(state.ui.flashIndex>=cards.length) state.ui.flashIndex=0; const c=cards[state.ui.flashIndex]; qs('flashCard').textContent=state.ui.flashFlipped ? c.answer : c.question; qs('flashList').innerHTML=cards.map(c=>`<div class="flash" data-id="${c.id}"><div><div class="item-title">${escapeHtml(c.question)}</div><div class="item-meta">${escapeHtml(c.answer)}</div></div><div><span class="pill p-purple">${escapeHtml(c.deck)}</span></div><div class="item-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join(''); }
function selectDeck(deck){ state.ui.selectedDeck=deck; state.ui.flashIndex=0; state.ui.flashFlipped=false; saveState(); renderSections('flashcards'); }
window.selectDeck=selectDeck;
function deleteFlash(id){ state.flashcards=state.flashcards.filter(f=>f.id!==id); const decks=[...new Set(state.flashcards.map(f=>f.deck))]; if(!decks.includes(state.ui.selectedDeck)) state.ui.selectedDeck=decks[0] || ''; state.ui.flashIndex=0; state.ui.flashFlipped=false; saveState(); renderSections('flashcards'); toast('Card deleted'); }
window.deleteFlash=deleteFlash;
function renderExams(){
  const el=qs('examList');
  if(!el) return;
  const exams=[...state.exams].sort((a,b)=>daysLeft(a.date)-daysLeft(b.date));
  el.innerHTML=exams.length ? exams.map(e=>`<div class="exam" data-id="${e.id}"><div><div class="item-title">${escapeHtml(e.name)}</div><div class="item-meta">${escapeHtml(e.subject)} • ${formatDate(e.date)}</div></div><div class="countdown">${daysLeft(e.date)} <span>days left</span></div><div class="item-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No exams added</strong>Add an exam to see countdown details.</div>';
}
function deleteExam(id){ state.exams=state.exams.filter(e=>e.id!==id); saveState(); renderSections('stats','dashboard','exams','calendar'); toast('Exam deleted'); }
window.deleteExam=deleteExam;
function renderGoals(){ qs('goalList').innerHTML=state.goals.length ? state.goals.map(g=>`<div class="goal" data-id="${g.id}"><div><div class="item-title">${escapeHtml(g.title)}</div><div class="item-meta">Target ${g.target}% • Current ${g.progress}%</div><div class="bar" style="margin-top:10px"><span style="width:${Math.min(100,g.progress)}%"></span></div></div><div><span class="pill p-blue">${g.progress}%</span></div><div class="item-actions"><button type="button" class="icon-btn" data-action="bump" data-bump="10">+10</button><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No goals added</strong>Create a goal to track your target progress.</div>'; }
function bumpGoal(id,val){ const g=state.goals.find(x=>x.id===id); if(!g) return; g.progress=Math.min(100,g.progress+val); saveState(); renderSections('stats','dashboard','goals'); }
window.bumpGoal=bumpGoal;
function deleteGoal(id){ state.goals=state.goals.filter(g=>g.id!==id); saveState(); renderSections('stats','dashboard','goals'); toast('Goal deleted'); }
window.deleteGoal=deleteGoal;
function renderTimetable(){ const days=['Mon','Tue','Wed','Thu','Fri','Sat']; let html='<div class="tt-head">Time</div>'+days.map(d=>`<div class="tt-head">${d}</div>`).join(''); const times=['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00']; times.forEach(t=>{ html+=`<div class="tt-time">${t}</div>`; days.forEach(d=>{ const item=state.timetable.find(x=>x.day===d && getTimeStartLabel(x.time)===t); html+=`<div class="tt-cell">${item?`<div class="tt-class" style="background:${item.color}">${escapeHtml(item.name)}<br>${escapeHtml(item.time)}</div>`:''}</div>`; }); }); qs('ttBoard').innerHTML=html; qs('ttList').innerHTML=state.timetable.length ? state.timetable.map(t=>`<div class="tt-item" data-id="${t.id}"><div><div class="item-title">${escapeHtml(t.name)}</div><div class="item-meta">${t.day} • ${escapeHtml(t.time)}</div></div><div><span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:${t.color}"></span></div><div class="item-actions"><button type="button" class="icon-btn delete" data-action="delete">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No timetable entries</strong>Add classes to build your weekly timetable.</div>'; }
function deleteTt(id){ state.timetable=state.timetable.filter(t=>t.id!==id); saveState(); renderSections('timetable'); toast('Class removed'); }
window.deleteTt=deleteTt;
function renderAnalytics(){ const total=state.tasks.length; const done=state.tasks.filter(t=>t.done).length; qs('completionRate').textContent=(total?Math.round(done/total*100):0)+'%'; qs('habitRate').textContent=state.habits.reduce((a,h)=>a+h.days.filter(Boolean).length,0); const avg=state.grades.length?(state.grades.reduce((a,b)=>a+b.score,0)/state.grades.length):0; qs('avgGrade').textContent=avg.toFixed(1); qs('goalRate').textContent=state.goals.filter(g=>g.progress>=100).length; }
function renderCharts(){
  renderAnalytics();
  const pctx=qs('priorityChart');
  const gctx=qs('gradeChart');
  if(!pctx || !gctx) return;
  if(typeof Chart==='undefined'){
    showChartUnavailable(pctx,'Charts unavailable','Chart library could not load in this browser session.');
    showChartUnavailable(gctx,'Charts unavailable','Reload once with internet access to display analytics charts.');
    return;
  }
  pctx.style.display='';
  gctx.style.display='';
  const accent=state.settings?.accent||'#5e6ad2';
  const muted=document.body.classList.contains('dark')?'#a1a1aa':'#6b7280';
  const grid=document.body.classList.contains('dark')?'rgba(255,255,255,0.06)':'rgba(17,24,39,0.06)';
  const font={family:"Inter, system-ui, sans-serif",size:12};
  if(priorityChart) priorityChart.destroy();
  if(gradeChart) gradeChart.destroy();
  priorityChart=new Chart(pctx,{
    type:'doughnut',
    data:{
      labels:['Low','Medium','High'],
      datasets:[{
        data:['low','medium','high'].map(p=>state.tasks.filter(t=>t.priority===p).length),
        backgroundColor:['#34d399','#fbbf24','#fb7185'],
        borderWidth:0,
        hoverOffset:6
      }]
    },
    options:{
      cutout:'62%',
      plugins:{
        legend:{position:'bottom',labels:{color:muted,font,padding:16,usePointStyle:true,pointStyleWidth:8}}
      }
    }
  });
  gradeChart=new Chart(gctx,{
    type:'bar',
    data:{
      labels:state.grades.map(g=>g.subject),
      datasets:[{
        label:'Score',
        data:state.grades.map(g=>g.score),
        backgroundColor:accent,
        borderRadius:8,
        borderSkipped:false,
        maxBarThickness:40
      }]
    },
    options:{
      scales:{
        x:{grid:{display:false},ticks:{color:muted,font}},
        y:{beginAtZero:true,max:100,grid:{color:grid},ticks:{color:muted,font}}
      },
      plugins:{legend:{display:false}}
    }
  });
}
function renderSettings(){
  qs('toggleToast').classList.toggle('on',state.settings.toasts);
  qs('toggleAutosave').classList.toggle('on',state.settings.autosave);
  qs('profileName').value=state.settings.profileName||'';
  qs('accentColor').value=state.settings.accent||'#2563eb';
  applyAccentColor(state.settings.accent||'#2563eb');
  qs('welcomeChip').textContent='Welcome, '+(state.settings.profileName || loadAuth()?.name || 'Student');
  const apiInput=qs('openRouterApiKey');
  if(apiInput) apiInput.value=state.settings.openRouterApiKey||'';
  updateApiKeyStatus();
}
function renderAll(){
  if(!sessionLoggedIn) return;
  renderSections('stats','dashboard','tasks','notes','calendar','timer','focusLog','grades','habits','flashcards','exams','goals','timetable','analytics','settings');
}

function mdToHtml(text) {
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code>$1</code>')
    .replace(/^### (.+)$/gm,'<strong>$1</strong>')
    .replace(/^## (.+)$/gm,'<strong>$1</strong>')
    .replace(/^# (.+)$/gm,'<strong>$1</strong>')
    .replace(/^\d+\.\s(.+)$/gm,'<li>$1</li>')
    .replace(/^[-*]\s(.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s=>`<ul>${s}</ul>`)
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>')
    .replace(/^(.+)$/,'<p>$1</p>');
}

function clearPopupChat(){
  popupHistory=[];
  popupTyping=false;
  const wrap=document.getElementById('popupMessages');
  if(!wrap) return;
  wrap.innerHTML=`<div class="popup-welcome" id="popupWelcome"><div style="font-size:28px;margin-bottom:8px;">✦</div><div style="font-weight:600;margin-bottom:4px;">AI Study Assistant</div><div style="font-size:12px;opacity:.7;">Ask me anything about your studies!</div></div>`;
  const popupSend=document.getElementById('popupSendBtn');
  if(popupSend) popupSend.disabled=false;
  const popupInput=document.getElementById('popupAiInput');
  if(popupInput){ popupInput.value=''; popupInput.style.height=''; }
}

function resetAiChats(){
  popupHistory=[];
  popupTyping=false;
  clearPopupChat();
  const popup=document.getElementById('aiPopup');
  if(popup) popup.classList.remove('show-ai');
}

function initStudyFlow(){
  if(localStorage.getItem('theme')==='dark') document.body.classList.add('dark');
  renderAuth();
  bindStaticEvents();
  updateThemeToggleUi();
  if(sessionLoggedIn){
    renderAll();
    switchPage('dashboard');
    if(state.timerRunning) startTimer();
    updateApiKeyStatus();
  } else {
    applyAccentColor(state.settings.accent||'#2563eb');
  }
}
initStudyFlow();

/* =========================================
   FLOATING AI POPUP
========================================= */

window.toggleAiPopup = function() {
  const aiPopup = document.getElementById('aiPopup');
  if (aiPopup) {
    aiPopup.classList.toggle('show-ai');
  }
};

window.closeAiPopupFn = function() {
  const aiPopup = document.getElementById('aiPopup');
  if (aiPopup) {
    aiPopup.classList.remove('show-ai');
  }
  const apiInput=qs('openRouterApiKey');
  if(apiInput && document.activeElement===apiInput) apiInput.blur();
};

window.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('closeAiPopup');
  if (closeBtn) {
    closeBtn.addEventListener('click', window.closeAiPopupFn);
  }
});
// ═══════════════════════════════
// FLOATING POPUP CHAT LOGIC
// ═══════════════════════════════

let popupHistory = [];
let popupTyping = false;

function popupRenderMsg(role, html) {
  const welcome = document.getElementById('popupWelcome');
  if (welcome) welcome.remove();
  const wrap = document.getElementById('popupMessages');
  const div = document.createElement('div');
  div.className = `popup-msg ${role}`;
  div.innerHTML = `<div class="popup-msg-bubble">${html}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function popupShowTyping() {
  const welcome = document.getElementById('popupWelcome');
  if (welcome) welcome.remove();
  const wrap = document.getElementById('popupMessages');
  const div = document.createElement('div');
  div.className = 'popup-msg ai';
  div.id = 'popupTypingIndicator';
  div.innerHTML = `<div class="popup-typing"><span></span><span></span><span></span></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function popupRemoveTyping() {
  const el = document.getElementById('popupTypingIndicator');
  if (el) el.remove();
}

window.sendPopupMessage = async function() {
  const input = document.getElementById('popupAiInput');
  const sendBtn = document.getElementById('popupSendBtn');
  const text = input.value.trim();
  if (!text || popupTyping) return;
  input.value = '';
  input.style.height = '';
  popupTyping = true;
  sendBtn.disabled = true;
  popupRenderMsg('user', escapeHtml(text));
  popupHistory.push({ role: 'user', content: text });
  capHistory(popupHistory);
  popupShowTyping();

  const API_KEY=getOpenRouterApiKey();
  if(!API_KEY){
    popupRemoveTyping();
    popupRenderMsg('ai','⚠️ No API key — add it in Settings → Integrations');
    popupTyping=false;
    sendBtn.disabled=false;
    return;
  }
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful AI study assistant for students. Keep answers concise and clear.' },
          ...popupHistory
        ]
      })
    });
    const data = await resp.json();
    popupRemoveTyping();
    if (!resp.ok) {
      popupRenderMsg('ai', `⚠️ ${data.error?.message || 'Request failed'}`);
    } else {
      const reply = data.choices?.[0]?.message?.content || 'No response received.';
      popupHistory.push({ role: 'assistant', content: reply });
      capHistory(popupHistory);
      popupRenderMsg('ai', mdToHtml(reply));
    }
  } catch(e) {
    popupRemoveTyping();
    popupRenderMsg('ai', '⚠️ Connection error. Check your internet and try again.');
  }
  popupTyping = false;
  sendBtn.disabled = false;
  input.focus();
};

window.popupInputKeydown = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPopupMessage(); }
};

window.autoResizePopupInput = function(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 90) + 'px';
};
