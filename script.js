function uid(){ return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2); }
const storageKey='studyflow_rebuilt_final_v2';
const authKey='studyflow_auth_rebuilt_v2';
const defaultState={
  settings:{toasts:true,autosave:true,profileName:'',accent:'#2563eb'},
  tasks:[
    
  ],
  notes:[],
  calendarDate:new Date().toISOString(),
  timerSeconds:1500,timerRunning:false,timerMode:1500,focusSessions:[],
  timetable:[{id:uid(),name:'Math',day:'Mon',time:'9:00 - 10:00',color:'#2563eb'}],
  grades:[{id:uid(),subject:'Math',score:84,credits:4},{id:uid(),subject:'DBMS',score:77,credits:3}],
  habits:[{id:uid(),name:'Drink Water',icon:'💧',target:5,days:[false,false,false,false,false,false,false]}],
  flashcards:[{id:uid(),deck:'DBMS',question:'What is normalization?',answer:'Organizing data to reduce redundancy.'}],
  exams:[],
  goals:[{id:uid(),title:'Complete Syllabus',target:100,progress:45}],
  ui:{selectedDeck:'DBMS',flashIndex:0,flashFlipped:false}
};
let state=loadState();
let timerInterval=null;
let calendarCursor=new Date(state.calendarDate || new Date().toISOString());
let priorityChart=null,gradeChart=null;
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
function saveState(){ if(state.settings?.autosave!==false) localStorage.setItem(storageKey,JSON.stringify(state)); }
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
function daysLeft(dateStr){ const today=new Date(); today.setHours(0,0,0,0); const d=new Date(dateStr+'T00:00:00'); return Math.ceil((d-today)/86400000); }
function formatDate(dateStr){ if(!dateStr) return 'No due date'; return new Date(dateStr+'T00:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }
function shadeHexColor(hex,percent){ const clean=String(hex).replace('#',''); const full=clean.length===3 ? clean.split('').map(c=>c+c).join('') : clean; const num=parseInt(full,16); const amt=Math.round(2.55*percent); const r=Math.max(0,Math.min(255,(num>>16)+amt)); const g=Math.max(0,Math.min(255,((num>>8)&255)+amt)); const b=Math.max(0,Math.min(255,(num&255)+amt)); return '#' + (0x1000000 + r*0x10000 + g*0x100 + b).toString(16).slice(1); }
function applyAccentColor(color){ const accent=color || '#2563eb'; document.documentElement.style.setProperty('--primary',accent); document.documentElement.style.setProperty('--primary-2',shadeHexColor(accent,-10)); document.documentElement.style.setProperty('--primary-soft',shadeHexColor(accent,38)); }
function getTimeStartLabel(time=''){ const match=String(time).match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); if(!match) return ''; let hour=Number(match[1]); const minute=(match[2]||'00').padStart(2,'0'); const suffix=(match[3]||'').toLowerCase(); if(suffix==='pm' && hour<12) hour+=12; if(suffix==='am' && hour===12) hour=0; return `${hour}:${minute}`; }

function renderAuth(){
  const auth=loadAuth();
  if(auth?.loggedIn){
    qs('authRoot').innerHTML='';
    qs('appRoot').classList.remove('hidden');
    if(qs('todayDatePill')) qs('todayDatePill').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
    if(qs('welcomeChip')) qs('welcomeChip').textContent='Welcome, '+(state.settings.profileName || auth.name || 'Student');
    if(!state.settings.profileName && auth.name){ state.settings.profileName=auth.name; saveState(); }
    return;
  }
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
          <p class="auth-subtitle">Sign in to continue to your workspace or use guest access for demonstration.</p>
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
                <div class="auth-help">Profile information is stored locally in the browser for this project.</div>
              </div>
            </div>
            <div class="authPane hidden" id="guestPane">
              <h2>Continue as guest</h2>
              <p>Quick access mode for project demonstration and evaluation.</p>
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
    return alert('Enter email and password');
  }

  const users = loadUsers();

  const user = users.find(u =>
    u.email === email &&
    u.password === password
  );

  if(!user){
    return alert('Invalid email or password');
  }

  completeLogin(user.name, user.email);
};
  qs('loginPassword').addEventListener('keydown',e=>{ if(e.key==='Enter') qs('loginBtn').click(); });
  qs('signupBtn').onclick = () => {

  const name = qs('signupName').value.trim();
  const email = qs('signupEmail').value.trim();
  const password = qs('signupPassword').value.trim();

  if(!name || !email || !password){
    return alert('Fill all sign up fields');
  }

  const users = loadUsers();

  const existingUser = users.find(u => u.email === email);

  if(existingUser){
    return alert('Account already exists');
  }

  users.push({
    id: uid(),
    name,
    email,
    password
  });

  saveUsers(users);

  alert('Account created successfully');

  completeLogin(name, email);
};
  qs('guestBtn').onclick=()=>{
    const name=qs('guestName').value.trim() || 'Guest Student';
    completeLogin(name,'guest@demo.local');
  };
}


function startDashboardTransition(name,email){

    const splash = document.getElementById("splashScreen");

    splash.classList.remove("hidden");

    saveAuth({
        loggedIn:true,
        name,
        email
    });

    state.settings.profileName = name;

    saveState();

    setTimeout(()=>{

        renderAuth();
        renderAll();
        switchPage('dashboard');

        splash.classList.add("fade-out");

        setTimeout(()=>{

            splash.classList.add("hidden");
            splash.classList.remove("fade-out");

        },800);

    },2500);
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

function switchPage(name){
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
    settings:['Settings','Manage profile and dashboard preferences.'],
    ai:['AI Assistant','Your personal AI study tutor, planner, and quiz master.']
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
  qs('logoutBtn').onclick=()=>openConfirmModal('Logout','Are you sure you want to logout from the dashboard?',()=>{ pauseTimer(); clearAuth(); closeConfirmModal(); renderAuth(); })
 qs('resetAllBtn').onclick = () => {

    const confirmReset = confirm(
        "Reset all dashboard data?"
    );

    if(!confirmReset) return;

    // FORCE CLEAN DEFAULT STATE
    state = JSON.parse(JSON.stringify(defaultState));

    // OVERWRITE STORAGE COMPLETELY
    localStorage.setItem(
        storageKey,
        JSON.stringify(state)
    );

    // RESET DATE
    calendarCursor = new Date();

    // STOP TIMER
    pauseTimer();

    // FULL UI REFRESH
    renderDashboard();
    renderTasks();
    renderNotes();
    renderCalendar();
    renderTimer();
    renderAnalytics();
    renderTimetable();
    renderGrades();
    renderHabits();
    renderFlashcards();
    renderExams();
    renderGoals();

    // GO TO DASHBOARD
    switchPage('dashboard');

    toast('Dashboard reset successfully');
};
  qs('exportBtn').onclick=()=>{ const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='studyflow-data.json'; a.click(); URL.revokeObjectURL(a.href); };
  qs('importFile').onchange=e=>{ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const imported=JSON.parse(reader.result); state=mergeState(defaultState,imported); calendarCursor=new Date(state.calendarDate || new Date().toISOString()); saveState(); renderAll(); toast('Data imported'); }catch(err){ toast('Invalid JSON file'); } }; reader.readAsText(file); e.target.value=''; };

  qs('addTaskBtn').onclick=()=>{ const title=qs('taskTitle').value.trim(); const desc=qs('taskDesc').value.trim(); const due=qs('taskDue').value; const priority=qs('taskPriority').value; if(!title) return toast('Enter task title'); state.tasks.unshift({id:uid(),title,desc,due,priority,done:false}); qs('taskTitle').value=''; qs('taskDesc').value=''; qs('taskDue').value=''; qs('taskPriority').value='medium'; saveState(); renderAll(); toast('Task added'); };
  qs('taskFilter').onchange=renderTasks; qs('taskSearch').oninput=renderTasks;
  qs('addNoteBtn').onclick=()=>{ addNote(qs('noteTitle').value,qs('noteBody').value); qs('noteTitle').value=''; qs('noteBody').value=''; };
  qs('quickAddNoteBtn').onclick=()=>{ addNote(qs('quickNoteTitle').value,qs('quickNoteBody').value); qs('quickNoteTitle').value=''; qs('quickNoteBody').value=''; };
  qs('noteSearch').oninput=renderNotes;
  qs('prevMonthBtn').onclick=()=>{ calendarCursor.setMonth(calendarCursor.getMonth()-1); renderCalendar(); };
  qs('nextMonthBtn').onclick=()=>{ calendarCursor.setMonth(calendarCursor.getMonth()+1); renderCalendar(); };
  qs('startTimerBtn').onclick=startTimer;
  qs('pauseTimerBtn').onclick=()=>{ pauseTimer(); toast('Timer paused'); };
  qs('resetTimerBtn').onclick=()=>{ resetTimer(); toast('Timer reset'); };
  document.querySelectorAll('.modeBtn').forEach(btn=>btn.onclick=()=>{ pauseTimer(); document.querySelectorAll('.modeBtn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); state.timerMode=Number(btn.dataset.mode); state.timerSeconds=state.timerMode; state.timerRunning=false; saveState(); renderTimer(); renderStats(); });
  qs('addGradeBtn').onclick=()=>{ const subject=qs('gradeSubject').value.trim(); const score=Number(qs('gradeScore').value); const credits=Number(qs('gradeCredits').value); if(!subject||Number.isNaN(score)||Number.isNaN(credits)) return toast('Fill all grade fields'); state.grades.unshift({id:uid(),subject,score,credits}); qs('gradeSubject').value=''; qs('gradeScore').value=''; qs('gradeCredits').value=''; saveState(); renderAll(); toast('Grade added'); };
  qs('addHabitBtn').onclick=()=>{ const name=qs('habitName').value.trim(); const icon=qs('habitIcon').value.trim()||'✅'; const target=Number(qs('habitTarget').value)||1; if(!name) return toast('Enter habit name'); state.habits.unshift({id:uid(),name,icon,target,days:[false,false,false,false,false,false,false]}); qs('habitName').value=''; qs('habitIcon').value=''; qs('habitTarget').value=''; saveState(); renderAll(); toast('Habit added'); };
  qs('addFlashBtn').onclick=()=>{ const deck=qs('deckName').value.trim(); const question=qs('cardQuestion').value.trim(); const answer=qs('cardAnswer').value.trim(); if(!deck||!question||!answer) return toast('Fill all flashcard fields'); state.flashcards.unshift({id:uid(),deck,question,answer}); state.ui.selectedDeck=deck; state.ui.flashIndex=0; state.ui.flashFlipped=false; qs('deckName').value=''; qs('cardQuestion').value=''; qs('cardAnswer').value=''; saveState(); renderAll(); toast('Flashcard added'); };
  qs('flipFlashBtn').onclick=()=>{ state.ui.flashFlipped=!state.ui.flashFlipped; renderFlashcards(); };
  qs('prevFlashBtn').onclick=()=>{ const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); if(!cards.length) return; state.ui.flashIndex=(state.ui.flashIndex-1+cards.length)%cards.length; state.ui.flashFlipped=false; renderFlashcards(); };
  qs('nextFlashBtn').onclick=()=>{ const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); if(!cards.length) return; state.ui.flashIndex=(state.ui.flashIndex+1)%cards.length; state.ui.flashFlipped=false; renderFlashcards(); };
  qs('flashCard').onclick=()=>qs('flipFlashBtn').click();
  qs('addExamBtn').onclick=()=>{ const name=qs('examName').value.trim(); const date=qs('examDate').value; const subject=qs('examSubject').value.trim(); if(!name||!date||!subject) return toast('Fill all exam fields'); state.exams.unshift({id:uid(),name,date,subject}); qs('examName').value=''; qs('examDate').value=''; qs('examSubject').value=''; saveState(); renderAll(); toast('Exam added'); };
  qs('addGoalBtn').onclick=()=>{ const title=qs('goalTitle').value.trim(); const target=Number(qs('goalTarget').value)||100; const progress=Number(qs('goalProgressInput').value)||0; if(!title) return toast('Enter goal title'); state.goals.unshift({id:uid(),title,target,progress}); qs('goalTitle').value=''; qs('goalTarget').value=''; qs('goalProgressInput').value=''; saveState(); renderAll(); toast('Goal added'); };
  qs('addTtBtn').onclick=()=>{ const name=qs('ttName').value.trim(); const day=qs('ttDay').value; const time=qs('ttTime').value.trim(); const color=qs('ttColor').value; if(!name||!time) return toast('Fill timetable fields'); state.timetable.unshift({id:uid(),name,day,time,color}); qs('ttName').value=''; qs('ttTime').value=''; saveState(); renderAll(); toast('Class added'); };
  qs('toggleToast').onclick=()=>{ state.settings.toasts=!state.settings.toasts; saveState(); renderSettings(); };
  qs('toggleAutosave').onclick=()=>{ state.settings.autosave=!state.settings.autosave; saveState(); renderSettings(); };
  qs('profileName').oninput=e=>{ state.settings.profileName=e.target.value; saveState(); qs('welcomeChip').textContent='Welcome, '+(e.target.value||'Student'); };
  qs('accentColor').oninput=e=>{ state.settings.accent=e.target.value; applyAccentColor(e.target.value); saveState(); };
  document.querySelectorAll('.settingsTab').forEach(btn=>btn.onclick=()=>{ document.querySelectorAll('.settingsTab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.settingsPane').forEach(p=>p.classList.add('hide')); qs('settings-'+btn.dataset.tab).classList.remove('hide'); });
}

function renderStats(){
  const total=state.tasks.length;
  const done=state.tasks.filter(t=>t.done).length;
  const notes=state.notes.length;
  const progress=total?Math.round(done/total*100):0;
  qs('statTotal').textContent=total;
  qs('statDone').textContent=done;
  qs('statNotes').textContent=notes;
  qs('statProgress').textContent=progress+'%';
  qs('dashTaskChip').textContent=(total-done)+' pending';
  qs('todayPendingCount').textContent=total-done;
  qs('todayExamCount').textContent=state.exams.length;
  qs('todayGoalCount').textContent=state.goals.filter(g=>g.progress<100).length;
  qs('focusStatusPill').textContent=state.timerRunning ? 'Focus timer running' : 'Focus timer ready';
  qs('todayDatePill').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
  qs('navTaskCount').textContent=total-done;
  const semester=Math.max(0,Math.min(100,progress+Math.min(40,state.goals.reduce((a,g)=>a+g.progress,0)/(state.goals.length||1)/3)));
  qs('semesterProgressLabel').textContent=Math.round(semester)+'%';
  qs('semesterProgressBar').style.width=Math.round(semester)+'%';
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
  if(q) tasks=tasks.filter(t=>t.title.toLowerCase().includes(q)||t.desc.toLowerCase().includes(q));
  qs('taskList').innerHTML=!tasks.length ? '<div class="empty"><strong>No tasks found</strong>Try a different filter or add a new task.</div>' : tasks.map(t=>`<div class="task ${t.done?'done':''}"><input class="check" type="checkbox" ${t.done?'checked':''} onchange="toggleTask('${t.id}')"><div><div class="task-title">${escapeHtml(t.title)}</div><div class="task-meta">${escapeHtml(t.desc||'No description')} • Due: ${escapeHtml(formatDate(t.due))} • <span class="pill p-${t.priority}">${t.priority}</span></div></div><div class="task-actions"><button class="icon-btn delete" onclick="deleteTask('${t.id}')">Delete</button></div></div>`).join('');
}
window.toggleTask=id=>{ const t=state.tasks.find(x=>x.id===id); if(!t) return; t.done=!t.done; saveState(); renderAll(); toast(t.done?'Task completed':'Task marked pending'); };
window.deleteTask=id=>{ state.tasks=state.tasks.filter(t=>t.id!==id); saveState(); renderAll(); toast('Task deleted'); };
function addNote(title,body){ if(!title.trim()) return toast('Enter note title'); state.notes.unshift({id:uid(),title:title.trim(),body:body.trim(),createdAt:Date.now()}); saveState(); renderAll(); toast('Note saved'); }
function renderNotes(){ const q=qs('noteSearch').value.trim().toLowerCase(); const notes=state.notes.filter(n=>!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)); qs('noteList').innerHTML=!notes.length ? '<div class="empty"><strong>No notes found</strong>Create a note or change your search.</div>' : notes.map(n=>`<div class="note"><div class="row between"><div><h3>${escapeHtml(n.title)}</h3><p>${escapeHtml(n.body)}</p><div class="muted" style="margin-top:8px;font-size:12px;">${new Date(n.createdAt).toLocaleString()}</div></div><button class="icon-btn delete" onclick="deleteNote('${n.id}')">Delete</button></div></div>`).join(''); }
window.deleteNote=id=>{ state.notes=state.notes.filter(n=>n.id!==id); saveState(); renderAll(); toast('Note deleted'); };
function renderCalendar(){ state.calendarDate=calendarCursor.toISOString(); saveState(); qs('monthLabel').textContent=calendarCursor.toLocaleDateString(undefined,{month:'long',year:'numeric'}); const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const first=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1); const last=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,0); const startDay=first.getDay(); const totalCells=Math.ceil((startDay+last.getDate())/7)*7; let html=names.map(n=>`<div class="dayhead">${n}</div>`).join(''); for(let i=0;i<totalCells;i++){ const dayNum=i-startDay+1; if(dayNum<1||dayNum>last.getDate()){ html+='<div class="day"></div>'; continue; } const d=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),dayNum); const key=d.toISOString().slice(0,10); const count=state.tasks.filter(t=>t.due===key).length+state.exams.filter(e=>e.date===key).length; const isToday=key===new Date().toISOString().slice(0,10); html+=`<div class="day ${isToday?'today':''}">${dayNum}${count?`<span class="count">${count} item${count>1?'s':''}</span>`:''}</div>`; } qs('calendarGrid').innerHTML=html; }
function renderTimer(){ const m=String(Math.floor(state.timerSeconds/60)).padStart(2,'0'); const s=String(state.timerSeconds%60).padStart(2,'0'); qs('timerDisplay').textContent=`${m}:${s}`; document.querySelectorAll('.modeBtn').forEach(btn=>btn.classList.toggle('active',Number(btn.dataset.mode)===state.timerMode)); }
function startTimer(){ if(timerInterval) return; state.timerRunning=true; saveState(); renderStats(); timerInterval=setInterval(()=>{ if(state.timerSeconds>0){ state.timerSeconds--; renderTimer(); saveState(); } else { clearInterval(timerInterval); timerInterval=null; state.timerRunning=false; state.focusSessions.unshift({id:uid(),at:Date.now(),mode:state.timerMode}); state.timerSeconds=state.timerMode; saveState(); renderTimer(); renderFocusLog(); renderStats(); toast('Focus session complete'); } },1000); }
function pauseTimer(){ clearInterval(timerInterval); timerInterval=null; state.timerRunning=false; saveState(); renderStats(); }
function resetTimer(){ pauseTimer(); state.timerSeconds=state.timerMode; saveState(); renderTimer(); }
function renderFocusLog(){ qs('focusLog').innerHTML=state.focusSessions.length ? state.focusSessions.slice(0,8).map(s=>`<div class="note"><div><h3>${s.mode===1500?'Focus':s.mode===300?'Short Break':'Long Break'}</h3><p>${new Date(s.at).toLocaleString()}</p></div></div>`).join('') : '<div class="empty"><strong>No sessions completed</strong>Your completed focus sessions will appear here.</div>'; }
function renderGrades(){ qs('gradeList').innerHTML=state.grades.length ? state.grades.map(g=>`<div class="grade"><div><div class="item-title">${escapeHtml(g.subject)}</div><div class="item-meta">Score: ${g.score} • Credits: ${g.credits}</div></div><div><span class="pill ${g.score>=80?'p-low':g.score>=60?'p-medium':'p-high'}">${g.score}</span></div><div class="item-actions"><button class="icon-btn delete" onclick="deleteGrade('${g.id}')">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No grades added</strong>Add subject scores to see your summary.</div>'; const avg=state.grades.length?(state.grades.reduce((a,b)=>a+b.score,0)/state.grades.length):0; qs('gpaBox').textContent=Math.min(10,avg/10).toFixed(2); }
window.deleteGrade=id=>{ state.grades=state.grades.filter(g=>g.id!==id); saveState(); renderAll(); toast('Grade deleted'); };
function renderHabits(){ qs('habitList').innerHTML=state.habits.length ? state.habits.map(h=>`<div class="habit"><div>${escapeHtml(h.icon||'✅')}</div><div><div class="item-title">${escapeHtml(h.name)}</div><div class="item-meta">Target ${h.target}/week</div><div class="week">${['S','M','T','W','T','F','S'].map((d,i)=>`<div class="wd ${h.days[i]?'done':''}" onclick="toggleHabitDay('${h.id}',${i})">${d}</div>`).join('')}</div></div><div class="item-actions"><button class="icon-btn delete" onclick="deleteHabit('${h.id}')">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No habits added</strong>Create a habit to begin tracking consistency.</div>'; }
window.toggleHabitDay=(id,i)=>{ const h=state.habits.find(x=>x.id===id); if(!h) return; h.days[i]=!h.days[i]; saveState(); renderAll(); };
window.deleteHabit=id=>{ state.habits=state.habits.filter(h=>h.id!==id); saveState(); renderAll(); toast('Habit deleted'); };
function renderFlashcards(){ const decks=[...new Set(state.flashcards.map(f=>f.deck))]; qs('deckFolders').innerHTML=decks.map(d=>`<div class="folder ${state.ui.selectedDeck===d?'active':''}" data-deck="${escapeHtml(d)}" onclick="selectDeck(this.dataset.deck)">${escapeHtml(d)}</div>`).join(''); const cards=state.flashcards.filter(f=>f.deck===state.ui.selectedDeck); qs('flashCount').textContent=cards.length+' cards'; if(!cards.length){ qs('flashCard').textContent='No cards in this deck'; qs('flashList').innerHTML='<div class="empty"><strong>No flashcards found</strong>Create cards to begin studying this deck.</div>'; return; } if(state.ui.flashIndex>=cards.length) state.ui.flashIndex=0; const c=cards[state.ui.flashIndex]; qs('flashCard').textContent=state.ui.flashFlipped ? c.answer : c.question; qs('flashList').innerHTML=cards.map(c=>`<div class="flash"><div><div class="item-title">${escapeHtml(c.question)}</div><div class="item-meta">${escapeHtml(c.answer)}</div></div><div><span class="pill p-purple">${escapeHtml(c.deck)}</span></div><div class="item-actions"><button class="icon-btn delete" onclick="deleteFlash('${c.id}')">Delete</button></div></div>`).join(''); }
window.selectDeck=deck=>{ state.ui.selectedDeck=deck; state.ui.flashIndex=0; state.ui.flashFlipped=false; saveState(); renderFlashcards(); };
window.deleteFlash=id=>{ state.flashcards=state.flashcards.filter(f=>f.id!==id); const decks=[...new Set(state.flashcards.map(f=>f.deck))]; if(!decks.includes(state.ui.selectedDeck)) state.ui.selectedDeck=decks[0] || ''; state.ui.flashIndex=0; state.ui.flashFlipped=false; saveState(); renderAll(); toast('Card deleted'); };
function renderExams(){ const exams=[...state.exams].sort((a,b)=>daysLeft(a.date)-daysLeft(b.date)); qs('examList').innerHTML=exams.length ? exams.map(e=>`<div class="exam"><div><div class="item-title">${escapeHtml(e.name)}</div><div class="item-meta">${escapeHtml(e.subject)} • ${formatDate(e.date)}</div></div><div class="countdown">${daysLeft(e.date)} <span>days left</span></div></div><div class="item-actions"><button class="icon-btn delete" onclick="deleteExam('${e.id}')">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No exams added</strong>Add an exam to see countdown details.</div>'; }
window.deleteExam=id=>{ state.exams=state.exams.filter(e=>e.id!==id); saveState(); renderAll(); toast('Exam deleted'); };
function renderGoals(){ qs('goalList').innerHTML=state.goals.length ? state.goals.map(g=>`<div class="goal"><div><div class="item-title">${escapeHtml(g.title)}</div><div class="item-meta">Target ${g.target}% • Current ${g.progress}%</div><div class="bar" style="margin-top:10px"><span style="width:${Math.min(100,g.progress)}%"></span></div></div><div><span class="pill p-blue">${g.progress}%</span></div><div class="item-actions"><button class="icon-btn" onclick="bumpGoal('${g.id}',10)">+10</button><button class="icon-btn delete" onclick="deleteGoal('${g.id}')">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No goals added</strong>Create a goal to track your target progress.</div>'; }
window.bumpGoal=(id,val)=>{ const g=state.goals.find(x=>x.id===id); if(!g) return; g.progress=Math.min(100,g.progress+val); saveState(); renderAll(); };
window.deleteGoal=id=>{ state.goals=state.goals.filter(g=>g.id!==id); saveState(); renderAll(); toast('Goal deleted'); };
function renderTimetable(){ const days=['Mon','Tue','Wed','Thu','Fri','Sat']; let html='<div class="tt-head">Time</div>'+days.map(d=>`<div class="tt-head">${d}</div>`).join(''); const times=['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00']; times.forEach(t=>{ html+=`<div class="tt-time">${t}</div>`; days.forEach(d=>{ const item=state.timetable.find(x=>x.day===d && getTimeStartLabel(x.time)===t); html+=`<div class="tt-cell">${item?`<div class="tt-class" style="background:${item.color}">${escapeHtml(item.name)}<br>${escapeHtml(item.time)}</div>`:''}</div>`; }); }); qs('ttBoard').innerHTML=html; qs('ttList').innerHTML=state.timetable.length ? state.timetable.map(t=>`<div class="tt-item"><div><div class="item-title">${escapeHtml(t.name)}</div><div class="item-meta">${t.day} • ${escapeHtml(t.time)}</div></div><div><span style="display:inline-block;width:12px;height:12px;border-radius:999px;background:${t.color}"></span></div><div class="item-actions"><button class="icon-btn delete" onclick="deleteTt('${t.id}')">Delete</button></div></div>`).join('') : '<div class="empty"><strong>No timetable entries</strong>Add classes to build your weekly timetable.</div>'; }
window.deleteTt=id=>{ state.timetable=state.timetable.filter(t=>t.id!==id); saveState(); renderAll(); toast('Class removed'); };
function renderAnalytics(){ const total=state.tasks.length; const done=state.tasks.filter(t=>t.done).length; qs('completionRate').textContent=(total?Math.round(done/total*100):0)+'%'; qs('habitRate').textContent=state.habits.reduce((a,h)=>a+h.days.filter(Boolean).length,0); const avg=state.grades.length?(state.grades.reduce((a,b)=>a+b.score,0)/state.grades.length):0; qs('avgGrade').textContent=avg.toFixed(1); qs('goalRate').textContent=state.goals.filter(g=>g.progress>=100).length; }
function renderCharts(){ renderAnalytics(); const pctx=qs('priorityChart'); const gctx=qs('gradeChart'); if(!pctx || !gctx) return; if(typeof Chart==='undefined'){ pctx.outerHTML='<div class="empty"><strong>Charts unavailable</strong>Chart library could not load in this browser session.</div>'; gctx.outerHTML='<div class="empty"><strong>Charts unavailable</strong>Reload once with internet access to display analytics charts.</div>'; return; } if(priorityChart) priorityChart.destroy(); if(gradeChart) gradeChart.destroy(); priorityChart=new Chart(pctx,{type:'doughnut',data:{labels:['Low','Medium','High'],datasets:[{data:['low','medium','high'].map(p=>state.tasks.filter(t=>t.priority===p).length)}]},options:{plugins:{legend:{position:'bottom'}}}}); gradeChart=new Chart(gctx,{type:'bar',data:{labels:state.grades.map(g=>g.subject),datasets:[{label:'Score',data:state.grades.map(g=>g.score)}]},options:{scales:{y:{beginAtZero:true,max:100}},plugins:{legend:{display:false}}}}); }
function renderSettings(){ qs('toggleToast').classList.toggle('on',state.settings.toasts); qs('toggleAutosave').classList.toggle('on',state.settings.autosave); qs('profileName').value=state.settings.profileName||''; qs('accentColor').value=state.settings.accent||'#2563eb'; applyAccentColor(state.settings.accent||'#2563eb'); qs('welcomeChip').textContent='Welcome, '+(state.settings.profileName || loadAuth()?.name || 'Student'); }
function renderAll(){ if(!loadAuth()?.loggedIn) return; renderStats(); renderDashboard(); renderTasks(); renderNotes(); renderCalendar(); renderTimer(); renderFocusLog(); renderGrades(); renderHabits(); renderFlashcards(); renderExams(); renderGoals(); renderTimetable(); renderAnalytics(); renderSettings(); }

// ═══════════════════════════════
// AI MODE
// ═══════════════════════════════
const AI_MODES = {
  tutor: {
    label: 'Study Tutor',
    desc: 'Explain any concept clearly',
    system: `You are an expert study tutor helping a student. You explain concepts clearly with examples, break down complex ideas, and check understanding. You are encouraging and patient. Keep responses focused and well-structured. Use markdown formatting with **bold** for key terms. When appropriate, use bullet points or numbered lists for clarity.`,
    prompts: ['Explain this concept to me', 'Give me an example', 'Why is this important?', 'Summarize my notes']
  },
  planner: {
    label: 'Study Planner',
    desc: 'Build a personalized study schedule',
    system: `You are a study planning expert. Help the student build an effective, realistic study schedule. Consider their exams, tasks, and goals. Suggest time-blocking techniques, prioritization, and breaks. Be specific and actionable.`,
    prompts: ['Make me a study schedule', 'How should I prioritize?', 'Plan my exam week', 'Best study techniques']
  },
  quiz: {
    label: 'Quiz Mode',
    desc: 'Test your knowledge interactively',
    system: `You are a quiz master. Generate thoughtful, educational questions on any topic the student mentions. After they answer, give detailed feedback — praise correct answers, gently correct mistakes, and always explain the reasoning. Make it engaging and educational.`,
    prompts: ['Quiz me on this topic', '5 MCQs on Newton\'s laws', 'Test my DBMS knowledge', 'Hard questions on history']
  },
  essay: {
    label: 'Essay Helper',
    desc: 'Write and improve essays',
    system: `You are an expert writing coach. Help students brainstorm, outline, draft, and revise essays and academic writing. Provide constructive feedback, suggest improvements in structure, clarity, and argumentation. Be specific in your suggestions.`,
    prompts: ['Outline this essay topic', 'Improve my introduction', 'Check my argument', 'Suggest a thesis statement']
  },
  flashgen: {
    label: 'Flashcard Generator',
    desc: 'Generate Q&A flashcards from any topic',
    system: `You are a flashcard generation expert. When given a topic or notes, generate clear, concise question-and-answer pairs perfect for spaced repetition study. Format each card as:\nQ: [question]\nA: [answer]\n\nMake questions specific and testable. Aim for 5-10 cards unless otherwise asked.`,
    prompts: ['Generate cards on photosynthesis', 'Flashcards for SQL joins', '10 cards on WW2 causes', 'Cards from these notes']
  },
  coach: {
    label: 'Motivation Coach',
    desc: 'Stay focused and beat procrastination',
    system: `You are an empathetic, energizing motivation coach for students. Help them overcome procrastination, manage study anxiety, build better habits, and stay consistent. Be warm, practical, and positive. Give specific actionable advice, not generic platitudes.`,
    prompts: ["I can't focus today", "Help me stop procrastinating", 'Build a study habit', "I'm stressed about exams"]
  }
};

let aiMode = 'tutor';
let aiHistory = [];
let aiIsTyping = false;

window.setAiMode = function(mode, el) {
  aiMode = mode;
  document.querySelectorAll('.ai-mode-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const m = AI_MODES[mode];
  qs('aiModeLabel').textContent = m.label;
  qs('aiModeDesc').textContent = m.desc;
  renderAiQuickPrompts();
};

function renderAiQuickPrompts() {
  const m = AI_MODES[aiMode];
  qs('aiQuickPrompts').innerHTML = m.prompts.map(p =>
    `<button class="ai-quick-btn" onclick="useQuickPrompt(this.textContent)">${p}</button>`
  ).join('');
}

window.useQuickPrompt = function(text) {
  qs('aiInput').value = text;
  sendAiMessage();
};

function getStudentContext() {
  const pending = state.tasks.filter(t=>!t.done).length;
  const examsArr = state.exams.map(e=>`${e.name} (${e.subject}, ${daysLeft(e.date)})`).join(', ');
  const avg = state.grades.length ? (state.grades.reduce((a,b)=>a+b.score,0)/state.grades.length).toFixed(1) : 'N/A';
  return `\n\n[Student context: ${pending} pending tasks, exams: ${examsArr||'none'}, avg grade: ${avg}]`;
}

function renderAiMessage(role, html) {
  const welcome = qs('aiWelcome');
  if (welcome) welcome.remove();
  const wrap = qs('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = `<div class="ai-msg-avatar">${role==='ai'?'✦':'👤'}</div><div class="ai-msg-bubble">${html}</div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTypingIndicator() {
  const welcome = qs('aiWelcome');
  if (welcome) welcome.remove();
  const wrap = qs('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg ai';
  div.id = 'aiTypingIndicator';
  div.innerHTML = `<div class="ai-msg-avatar">✦</div><div class="ai-typing"><span></span><span></span><span></span></div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('aiTypingIndicator');
  if (el) el.remove();
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

window.sendAiMessage = async function() {
  const input = qs('aiInput');
  const text = input.value.trim();
  if (!text || aiIsTyping) return;
  input.value = '';
  input.style.height = '';
  aiIsTyping = true;
  qs('aiSendBtn').disabled = true;
  renderAiMessage('user', mdToHtml(text));
  aiHistory.push({ role: 'user', content: text });
  showTypingIndicator();
  const mode = AI_MODES[aiMode];
  const systemPrompt = mode.system + (aiMode==='planner'?getStudentContext():'');
  try {
    const API_KEY = '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';

const resp = await fetch(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",

    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      model: "openai/gpt-3.5-turbo",

      messages: [
        {
          role: "system",
          content: systemPrompt
        },

        {
          role: "user",
          content: text
        }
      ]

    })
  }
);

const data = await resp.json();

console.log(data);

if (!resp.ok) {

  removeTypingIndicator();

  renderAiMessage(
    'ai',
    `<p>⚠️ ${data.error?.message || 'AI request failed'}</p>`
  );

  aiIsTyping = false;

  qs('aiSendBtn').disabled = false;

  return;
}

const reply =
  data.choices?.[0]?.message?.content ||
  "No response received.";
    aiHistory.push({ role: 'assistant', content: reply });
    removeTypingIndicator();
    renderAiMessage('ai', mdToHtml(reply));
  } catch(e) {
    removeTypingIndicator();
    renderAiMessage('ai', '<p>⚠️ Connection error. Please check your internet and try again.</p>');
  }
  aiIsTyping = false;
  qs('aiSendBtn').disabled = false;
  qs('aiInput').focus();
};

window.clearAiChat = function() {
  aiHistory = [];
  qs('aiMessages').innerHTML = `<div class="ai-welcome" id="aiWelcome"><div class="ai-welcome-icon">✦</div><h3>AI Study Assistant</h3><p>Choose a mode on the left, then ask me anything! I can tutor you, build a study plan, quiz you, help with essays, and more.</p></div>`;
};

window.aiInputKeydown = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
};

window.autoResizeAiInput = function(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

// Init AI prompts on page load
setTimeout(renderAiQuickPrompts, 100);

renderAuth();
if(loadAuth()?.loggedIn){ bindStaticEvents(); renderAll(); switchPage('dashboard'); if(state.timerRunning) startTimer(); }
else { bindStaticEvents(); applyAccentColor(state.settings.accent||'#2563eb'); }
// DARK MODE

const themeToggle = document.getElementById('themeToggle');

if(localStorage.getItem('theme') === 'dark'){

  document.body.classList.add('dark');

  if(themeToggle){
    themeToggle.textContent = '☀️';
  }

}

if(themeToggle){

  themeToggle.onclick = () => {

    document.body.classList.toggle('dark');

    if(document.body.classList.contains('dark')){

      localStorage.setItem('theme','dark');
      themeToggle.textContent = '☀️';

    } else {

      localStorage.setItem('theme','light');
      themeToggle.textContent = '🌙';

    }

  };

}
/* =========================================
   FLOATING AI POPUP
========================================= */

window.addEventListener('DOMContentLoaded', ()=>{

  const floatingAiBtn =
    document.getElementById('floatingAiBtn');

  const aiPopup =
    document.getElementById('aiPopup');

  console.log(floatingAiBtn);
  console.log(aiPopup);

  if(floatingAiBtn && aiPopup){

    floatingAiBtn.addEventListener(
      'click',
      ()=>{

        aiPopup.classList.toggle('open');

      }
    );

  }

});

// FLOATING AI CHAT

const floatingAiBtn = document.getElementById('floatingAiBtn');
const aiPopup = document.getElementById('aiPopup');
const closeAiPopup = document.getElementById('closeAiPopup');

if (floatingAiBtn && aiPopup) {

  floatingAiBtn.addEventListener('click', () => {
    aiPopup.classList.toggle('show');
  });

}

if (closeAiPopup) {

  closeAiPopup.addEventListener('click', () => {
    aiPopup.classList.remove('show');
  });

}
/* ===== SF INTRO ===== */
function showSFIntro(userName, onDone){
  const ex = document.getElementById('sfIntroOverlay');
  if(ex) ex.remove();
  const o = document.createElement('div');
  o.id = 'sfIntroOverlay';
  o.innerHTML = `
    <div class="sf-grid"></div>
    <div class="sf-glow sf-g1"></div>
    <div class="sf-glow sf-g2"></div>
    <div id="sfBox">
      <div id="sfIcon">📘</div>
      <div id="sfName"><span id="sfS">Study</span><span id="sfF">Flow</span></div>
      <div id="sfBar"></div>
      <div id="sfUser">Welcome, ` + '${escapeHtml(userName)}' + `</div>
    </div>`;
  document.body.appendChild(o);
  const d = ms => new Promise(r => setTimeout(r, ms));
  async function run(){
    await d(80);
    document.getElementById('sfIcon').classList.add('on');
    await d(180);
    document.getElementById('sfS').classList.add('on');
    await d(110);
    document.getElementById('sfF').classList.add('on');
    await d(280);
    document.getElementById('sfBar').classList.add('on');
    await d(380);
    document.getElementById('sfUser').classList.add('on');
    await d(950);
    o.classList.add('sf-out');
    await d(650);
    o.remove();
    onDone && onDone();
  }
  run();
}
 
