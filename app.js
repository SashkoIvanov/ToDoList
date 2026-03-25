/* ══════════════════════════════════════════════
   STREAKTODO — app.js v2
══════════════════════════════════════════════ */
'use strict';

// ─── STATE ────────────────────────────────────
let state = {
  tasks:      [],
  goals:      [],
  recurring:  [],
  streak:     0,
  bestStreak: 0,
  lastCompletedDate: null,
  history:    {},
  totalTasksDone: 0,
  profile: { name: 'My Profile', avatar: '⚡', joinedDate: null }
};

// ─── HELPERS ──────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc   = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function saveState() {
  try { localStorage.setItem('streaktodo_v2', JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem('streaktodo_v2');
    if (raw) state = Object.assign(state, JSON.parse(raw));
    if (!state.profile) state.profile = { name: 'My Profile', avatar: '⚡', joinedDate: null };
  } catch(e) {}
}

// ─── DATE UTILS ───────────────────────────────
function formatDateLabel(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
}
function isYesterday(iso) {
  if (!iso) return false;
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0] === iso;
}
function dowOfDate(iso) {
  return new Date(iso + 'T12:00:00').getDay();
}

// ─── RECURRING INJECTION ──────────────────────
function injectRecurringTasks() {
  const t = today(), dow = dowOfDate(t);
  state.recurring.forEach(rt => {
    if (!rt.days.includes(dow)) return;
    if (state.tasks.some(tk => tk.recurringId === rt.id && tk.date === t)) return;
    state.tasks.push({
      id: uid(), recurringId: rt.id, date: t,
      name: rt.name, starred: rt.starred || false,
      goalId: rt.goalId || '', notes: '',
      done: false, createdAt: Date.now()
    });
  });
}

// ─── TODAY TASKS ──────────────────────────────
function getTodayTasks() {
  return state.tasks
    .filter(t => t.date === today())
    .sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return a.createdAt - b.createdAt;
    });
}

// ─── STREAK ───────────────────────────────────
function evaluateStreak() {
  const t = today();
  const tasks = getTodayTasks();
  if (!tasks.length) return false;
  const allDone = tasks.every(tk => tk.done);
  state.history[t] = { total: tasks.length, done: tasks.filter(tk=>tk.done).length, perfect: allDone };
  if (allDone && state.lastCompletedDate !== t) {
    if (isYesterday(state.lastCompletedDate) || !state.lastCompletedDate) {
      state.streak = (state.streak || 0) + 1;
    } else {
      state.streak = 1;
    }
    state.lastCompletedDate = t;
    if (state.streak > (state.bestStreak||0)) state.bestStreak = state.streak;
    saveState();
    return true;
  }
  saveState();
  return false;
}

function checkStreakReset() {
  if (!state.lastCompletedDate) return;
  if (state.lastCompletedDate === today()) return;
  if (!isYesterday(state.lastCompletedDate)) {
    state.streak = 0;
    saveState();
  }
}

// ─── TOAST ────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ─── CONFETTI ─────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const COLORS = ['#6c63ff','#ff6584','#43e97b','#f7b731','#4facfe','#f953c6'];
  const pieces = Array.from({length:100}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*-canvas.height,
    r: Math.random()*5+3, d: Math.random()*80+40,
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
    tilt:0, tiltAngle:0, tiltSpeed: Math.random()*0.1+0.05
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.beginPath(); ctx.lineWidth=p.r; ctx.strokeStyle=p.color;
      ctx.moveTo(p.x+p.tilt+p.r/3, p.y);
      ctx.lineTo(p.x+p.tilt, p.y+p.tilt+p.r);
      ctx.stroke();
      p.tiltAngle += p.tiltSpeed;
      p.y += (Math.cos(frame*0.01+p.d)+2)*1.8;
      p.tilt = Math.sin(p.tiltAngle)*12;
      if (p.y > canvas.height) { p.x = Math.random()*canvas.width; p.y = -10; }
    });
    frame++;
    if (frame < 160) requestAnimationFrame(draw);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  draw();
}

// ─── MODALS ───────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  const cb = e.target.closest('[data-close]');
  if (cb) closeModal(cb.dataset.close);
  const ov = e.target.closest('.modal-overlay');
  if (ov && e.target === ov) closeModal(ov.id);
});

// ─── BOTTOM NAV ───────────────────────────────
document.querySelectorAll('.bnav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bnav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'profile') renderProfile();
  });
});

// ─── FILTER CHIPS ─────────────────────────────
let activeFilter = 'all';
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderTasks();
  });
});

// ─── GOAL SELECTS ─────────────────────────────
function populateGoalSelects() {
  ['taskGoal','recurringGoal'].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">— No goal —</option>';
    state.goals.forEach(g => {
      const o = document.createElement('option');
      o.value = g.id; o.textContent = g.emoji + ' ' + g.name;
      sel.appendChild(o);
    });
    sel.value = cur;
  });
}

// ─── STAR TOGGLE HELPER ───────────────────────
function initStarToggle(btnId, value = false) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.dataset.starred = value ? 'true' : 'false';
  btn.classList.toggle('on', value);
  btn.querySelector('.star-icon').textContent = value ? '⭐' : '☆';
  btn.querySelector('.star-text').textContent  = value ? 'Starred as important' : 'Tap to mark as important';
}

function getStarValue(btnId) {
  const btn = document.getElementById(btnId);
  return btn ? btn.dataset.starred === 'true' : false;
}

document.getElementById('taskStarToggle').addEventListener('click', () => {
  const btn = document.getElementById('taskStarToggle');
  const next = btn.dataset.starred !== 'true';
  initStarToggle('taskStarToggle', next);
});

document.getElementById('recurringStarToggle').addEventListener('click', () => {
  const btn = document.getElementById('recurringStarToggle');
  const next = btn.dataset.starred !== 'true';
  initStarToggle('recurringStarToggle', next);
});

// ══════════════════════════════════════════════
//  ADD TASK
// ══════════════════════════════════════════════
let editingTaskId = null;

document.getElementById('addTaskBtn').addEventListener('click', () => {
  editingTaskId = null;
  document.getElementById('taskModalTitle').textContent = 'New Task';
  document.getElementById('taskName').value = '';
  document.getElementById('taskNotes').value = '';
  document.getElementById('taskGoal').value = '';
  initStarToggle('taskStarToggle', false);
  populateGoalSelects();
  openModal('taskModal');
  setTimeout(() => document.getElementById('taskName').focus(), 350);
});

document.getElementById('saveTaskBtn').addEventListener('click', () => {
  const name = document.getElementById('taskName').value.trim();
  if (!name) { showToast('⚠️ Please enter a task name'); return; }
  const starred = getStarValue('taskStarToggle');
  const goalId  = document.getElementById('taskGoal').value;
  const notes   = document.getElementById('taskNotes').value.trim();

  if (editingTaskId) {
    const task = state.tasks.find(t => t.id === editingTaskId);
    if (task) { task.name = name; task.starred = starred; task.goalId = goalId; task.notes = notes; }
    showToast('✏️ Task updated!');
  } else {
    state.tasks.push({
      id: uid(), recurringId: null, date: today(),
      name, starred, goalId, notes, done: false, createdAt: Date.now()
    });
    showToast('✅ Task added!');
  }
  saveState(); closeModal('taskModal');
  renderTasks(); renderProgress(); renderGoals();
});

// ══════════════════════════════════════════════
//  ADD GOAL
// ══════════════════════════════════════════════
document.getElementById('addGoalBtn').addEventListener('click', () => {
  document.getElementById('goalName').value = '';
  selectedEmoji = '🎯'; selectedColor = '#6c63ff';
  document.querySelectorAll('.emoji-opt').forEach(b => b.classList.toggle('active', b.dataset.emoji==='🎯'));
  document.querySelectorAll('.color-opt').forEach(b => b.classList.toggle('active', b.dataset.color==='#6c63ff'));
  populateGoalSelects();
  openModal('goalModal');
  setTimeout(() => document.getElementById('goalName').focus(), 350);
});

document.getElementById('saveGoalBtn').addEventListener('click', () => {
  const name = document.getElementById('goalName').value.trim();
  if (!name) { showToast('⚠️ Please enter a goal name'); return; }
  state.goals.push({ id: uid(), name, emoji: selectedEmoji, color: selectedColor });
  saveState(); closeModal('goalModal'); populateGoalSelects(); renderGoals();
  showToast('🎯 Goal created!');
});

// ══════════════════════════════════════════════
//  ADD RECURRING
// ══════════════════════════════════════════════
document.getElementById('addRecurringBtn').addEventListener('click', () => {
  document.getElementById('recurringName').value = '';
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
  initStarToggle('recurringStarToggle', false);
  populateGoalSelects();
  openModal('recurringModal');
  setTimeout(() => document.getElementById('recurringName').focus(), 350);
});

document.getElementById('saveRecurringBtn').addEventListener('click', () => {
  const name = document.getElementById('recurringName').value.trim();
  const days = [...document.querySelectorAll('.day-btn.active')].map(b => parseInt(b.dataset.day));
  const starred = getStarValue('recurringStarToggle');
  const goalId  = document.getElementById('recurringGoal').value;
  if (!name) { showToast('⚠️ Please enter a task name'); return; }
  if (!days.length) { showToast('⚠️ Select at least one day'); return; }
  state.recurring.push({ id: uid(), name, starred, goalId, days });
  saveState(); closeModal('recurringModal');
  injectRecurringTasks(); renderAll();
  showToast('🔄 Recurring task added!');
});

// day presets
document.getElementById('presetEvery').addEventListener('click', () =>
  document.querySelectorAll('.day-btn').forEach(b => b.classList.add('active')));
document.getElementById('presetWeekdays').addEventListener('click', () =>
  document.querySelectorAll('.day-btn').forEach(b =>
    b.classList.toggle('active', ['1','2','3','4','5'].includes(b.dataset.day))));
document.getElementById('presetWeekends').addEventListener('click', () =>
  document.querySelectorAll('.day-btn').forEach(b =>
    b.classList.toggle('active', ['0','6'].includes(b.dataset.day))));
document.getElementById('presetClear').addEventListener('click', () =>
  document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active')));

// ══════════════════════════════════════════════
//  EMOJI / COLOR PICKERS
// ══════════════════════════════════════════════
let selectedEmoji = '🎯', selectedColor = '#6c63ff';
let selectedAvatar = '⚡';

document.querySelectorAll('#emojiPicker .emoji-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#emojiPicker .emoji-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedEmoji = btn.dataset.emoji;
  });
});
document.querySelectorAll('#colorPicker .color-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#colorPicker .color-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedColor = btn.dataset.color;
  });
});
document.querySelectorAll('#avatarPicker .emoji-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#avatarPicker .emoji-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); selectedAvatar = btn.dataset.emoji;
  });
});

// ══════════════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════════════
document.getElementById('editProfileBtn').addEventListener('click', () => {
  document.getElementById('profileNameInput').value = state.profile.name || '';
  selectedAvatar = state.profile.avatar || '⚡';
  document.querySelectorAll('#avatarPicker .emoji-opt').forEach(b =>
    b.classList.toggle('active', b.dataset.emoji === selectedAvatar));
  openModal('profileModal');
  setTimeout(() => document.getElementById('profileNameInput').focus(), 350);
});

document.getElementById('saveProfileBtn').addEventListener('click', () => {
  const name = document.getElementById('profileNameInput').value.trim() || 'My Profile';
  state.profile.name   = name;
  state.profile.avatar = selectedAvatar;
  if (!state.profile.joinedDate) state.profile.joinedDate = today();
  saveState(); closeModal('profileModal'); renderProfile();
  showToast('👤 Profile updated!');
});

// ══════════════════════════════════════════════
//  RENDER TASKS (FIX 3: instant DOM update)
// ══════════════════════════════════════════════
function renderTasks() {
  const list  = document.getElementById('taskList');
  const empty = document.getElementById('emptyToday');
  let tasks = getTodayTasks();
  if (activeFilter === 'starred') tasks = tasks.filter(t => t.starred);

  if (!tasks.length) {
    list.innerHTML = '';
    empty.style.display = '';
    list.appendChild(empty);
    return;
  }
  empty.style.display = 'none';

  // FIX 3: diff update — only re-render changed cards to avoid flicker
  const existingIds = [...list.querySelectorAll('.task-card')].map(c => c.dataset.id);
  const newIds = tasks.map(t => t.id);

  // Remove cards that no longer exist
  list.querySelectorAll('.task-card').forEach(card => {
    if (!newIds.includes(card.dataset.id)) card.remove();
  });

  tasks.forEach((task, idx) => {
    const goal = state.goals.find(g => g.id === task.goalId);
    const existing = list.querySelector(`.task-card[data-id="${task.id}"]`);

    if (existing) {
      // Just update the classes for instant done/star toggle
      existing.classList.toggle('done', task.done);
      existing.classList.toggle('starred', task.starred);
      const check = existing.querySelector('.task-check');
      check.textContent = task.done ? '✓' : '';
      const starBtn = existing.querySelector('[data-action="star"]');
      if (starBtn) {
        starBtn.textContent = task.starred ? '⭐' : '☆';
        starBtn.classList.toggle('star-active', task.starred);
      }
      return;
    }

    // Build new card
    const card = document.createElement('div');
    card.className = 'task-card' + (task.done ? ' done' : '') + (task.starred ? ' starred' : '');
    card.dataset.id = task.id;
    card.style.animationDelay = idx * 0.04 + 's';

    card.innerHTML = `
      <div class="task-check">${task.done ? '✓' : ''}</div>
      <div class="task-info">
        <div class="task-name">${esc(task.name)}</div>
        <div class="task-meta">
          ${goal ? `<span class="task-goal-tag" style="background:${goal.color}">${goal.emoji} ${esc(goal.name)}</span>` : ''}
        </div>
        ${task.notes ? `<div class="task-notes">${esc(task.notes)}</div>` : ''}
      </div>
      <div class="task-actions">
        <button class="task-action-btn${task.starred?' star-active':''}" data-action="star" title="Star">${task.starred?'⭐':'☆'}</button>
        <button class="task-action-btn" data-action="edit" title="Edit">✏️</button>
        <button class="task-action-btn" data-action="delete" title="Delete">🗑️</button>
      </div>
    `;

    card.querySelector('.task-check').addEventListener('click', () => toggleTask(task.id));
    card.querySelector('.task-name').addEventListener('click', () => toggleTask(task.id));

    card.querySelector('[data-action="star"]').addEventListener('click', e => {
      e.stopPropagation();
      const t = state.tasks.find(tk => tk.id === task.id);
      if (t) { t.starred = !t.starred; saveState(); renderTasks(); }
    });

    card.querySelector('[data-action="edit"]').addEventListener('click', e => {
      e.stopPropagation();
      editingTaskId = task.id;
      document.getElementById('taskModalTitle').textContent = 'Edit Task';
      document.getElementById('taskName').value = task.name;
      document.getElementById('taskNotes').value = task.notes || '';
      populateGoalSelects();
      document.getElementById('taskGoal').value = task.goalId || '';
      initStarToggle('taskStarToggle', task.starred || false);
      openModal('taskModal');
    });

    card.querySelector('[data-action="delete"]').addEventListener('click', e => {
      e.stopPropagation();
      state.tasks = state.tasks.filter(tk => tk.id !== task.id);
      saveState(); renderTasks(); renderProgress(); renderGoals();
      showToast('🗑️ Task deleted');
    });

    // Insert in right position
    const cards = [...list.querySelectorAll('.task-card')];
    if (idx < cards.length) list.insertBefore(card, cards[idx]);
    else list.appendChild(card);
  });
}

// FIX 3: instant toggle without full re-render
function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  if (task.done) state.totalTasksDone++;

  // Instant DOM update
  const card = document.querySelector(`.task-card[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('done', task.done);
    card.querySelector('.task-check').textContent = task.done ? '✓' : '';
  }

  saveState();
  renderProgress();
  renderGoals();

  const justCompleted = evaluateStreak();
  updateStreakBadge();

  if (justCompleted) {
    showToast(`🔥 Perfect day! Streak: ${state.streak} day${state.streak!==1?'s':''}!`);
    launchConfetti();
  }
}

// ══════════════════════════════════════════════
//  RENDER PROGRESS
// ══════════════════════════════════════════════
function renderProgress() {
  const tasks = getTodayTasks();
  const total = tasks.length, done = tasks.filter(t=>t.done).length;
  const pct = total === 0 ? 0 : Math.round(done/total*100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressFrac').textContent = `${done} / ${total}`;
  document.getElementById('progressDate').textContent = formatDateLabel(today());
  const msgs = [
    [0,  'Add tasks to start your streak 🚀'],
    [1,  "Let's go! You've got this 💪"],
    [50, 'Good progress! Keep going 🏃'],
    [99, 'Almost there! Final push 🎯'],
    [100,'🎉 Perfect day! Streak continues!']
  ];
  let msg = msgs[0][1];
  for (const [thr, m] of msgs) if (pct >= thr) msg = m;
  document.getElementById('progressMsg').textContent = msg;
}

// ══════════════════════════════════════════════
//  RENDER GOALS
// ══════════════════════════════════════════════
function renderGoals() {
  const list = document.getElementById('goalsList');
  if (!state.goals.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><p>No goals yet.<br/>Create a goal to group your tasks!</p></div>`;
    return;
  }
  list.innerHTML = '';
  state.goals.forEach(goal => {
    const todayT = getTodayTasks().filter(t => t.goalId === goal.id);
    const allT   = state.tasks.filter(t => t.goalId === goal.id);
    const done   = todayT.filter(t => t.done).length;
    const pct    = todayT.length ? Math.round(done/todayT.length*100) : 0;
    const card   = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-card-header">
        <div class="goal-title"><span class="goal-emoji">${goal.emoji}</span><span>${esc(goal.name)}</span></div>
        <button class="goal-delete-btn" data-id="${goal.id}">🗑️</button>
      </div>
      <div class="goal-tasks-count">${todayT.length} task${todayT.length!==1?'s':''} today · ${allT.length} total</div>
      <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%;background:${goal.color}"></div></div>
    `;
    card.querySelector('.goal-delete-btn').addEventListener('click', () => {
      state.goals = state.goals.filter(g => g.id !== goal.id);
      saveState(); renderGoals(); renderTasks(); showToast('🗑️ Goal deleted');
    });
    list.appendChild(card);
  });
}

// ══════════════════════════════════════════════
//  RENDER RECURRING
// ══════════════════════════════════════════════
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderRecurring() {
  const list = document.getElementById('recurringList');
  if (!state.recurring.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔄</div><p>No recurring tasks yet.<br/>Set tasks that repeat automatically!</p></div>`;
    return;
  }
  list.innerHTML = '';
  const todayDow = dowOfDate(today());
  state.recurring.forEach(rt => {
    const goal = state.goals.find(g => g.id === rt.goalId);
    const card = document.createElement('div');
    card.className = 'recurring-card' + (rt.starred ? ' starred' : '');
    const daysHtml = DAY_NAMES.map((d,i) => {
      const on = rt.days.includes(i);
      return `<span class="day-tag ${on?(i===todayDow?'today-active':''):'inactive'}">${d}</span>`;
    }).join('');
    card.innerHTML = `
      <div class="recurring-info">
        <div class="recurring-name">${rt.starred?'⭐ ':''}${esc(rt.name)}${goal?` <span class="task-goal-tag" style="background:${goal.color};font-size:10px">${goal.emoji} ${esc(goal.name)}</span>`:''}</div>
        <div class="recurring-days">${daysHtml}</div>
      </div>
      <button class="recurring-delete" data-id="${rt.id}">🗑️</button>
    `;
    card.querySelector('.recurring-delete').addEventListener('click', () => {
      state.recurring = state.recurring.filter(r => r.id !== rt.id);
      saveState(); renderRecurring(); showToast('🗑️ Recurring task removed');
    });
    list.appendChild(card);
  });
}

// ══════════════════════════════════════════════
//  RENDER PROFILE  (FIX 4: calendar + FIX 7: profile tab)
// ══════════════════════════════════════════════
let calYear, calMonth;

function renderProfile() {
  // Hero
  document.getElementById('profileAvatar').textContent = state.profile.avatar || '⚡';
  document.getElementById('profileNameDisplay').textContent = state.profile.name || 'My Profile';
  if (state.profile.joinedDate) {
    const d = new Date(state.profile.joinedDate + 'T12:00:00');
    document.getElementById('profileJoined').textContent =
      'Member since ' + d.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  }

  // Stats
  document.getElementById('statCurrentStreak').textContent = state.streak || 0;
  document.getElementById('statBestStreak').textContent    = state.bestStreak || 0;
  document.getElementById('statTotalTasks').textContent    = state.totalTasksDone || 0;
  document.getElementById('statTotalDays').textContent =
    Object.values(state.history).filter(h=>h.perfect).length;

  // Calendar — default to current month
  if (calYear === undefined) {
    const now = new Date();
    calYear = now.getFullYear(); calMonth = now.getMonth();
  }
  renderCalendar(calYear, calMonth);
}

function renderCalendar(year, month) {
  const container = document.getElementById('calendarSection');
  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayStr = today();

  let html = `
    <div class="cal-header">
      <div class="cal-title">${MONTH_NAMES[month]} ${year}</div>
      <div class="cal-nav">
        <button class="cal-nav-btn" id="calPrev">‹</button>
        <button class="cal-nav-btn" id="calNext">›</button>
      </div>
    </div>
    <div class="cal-dow-row">
      ${['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="cal-dow">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">
  `;

  // empty cells before first day
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const h   = state.history[iso];
    const isToday   = iso === todayStr;
    const isFuture  = iso > todayStr;
    const isPerfect = h && h.perfect;
    const isMissed  = h && !h.perfect && h.total > 0 && !isToday;

    let cls = 'cal-day';
    if (isToday)   cls += ' today';
    if (isPerfect) cls += ' perfect';
    else if (isMissed)  cls += ' missed';
    else if (isFuture)  cls += ' future';

    html += `<div class="${cls}" title="${iso}${h?` · ${h.done}/${h.total}`:''}">${d}</div>`;
  }

  html += `</div>`;
  container.innerHTML = html;

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar(calYear, calMonth);
  });
  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar(calYear, calMonth);
  });
}

// ══════════════════════════════════════════════
//  STREAK BADGE
// ══════════════════════════════════════════════
function updateStreakBadge() {
  document.getElementById('streakCount').textContent = state.streak || 0;
}

// ══════════════════════════════════════════════
//  RENDER ALL
// ══════════════════════════════════════════════
function renderAll() {
  renderTasks(); renderProgress(); renderGoals(); renderRecurring(); updateStreakBadge();
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
function init() {
  loadState();
  if (!state.profile.joinedDate) state.profile.joinedDate = today();
  checkStreakReset();
  injectRecurringTasks();
  populateGoalSelects();
  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }

  // Enter key in modals
  ['taskName','goalName','recurringName','profileNameInput'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const saveId = {taskName:'saveTaskBtn',goalName:'saveGoalBtn',recurringName:'saveRecurringBtn',profileNameInput:'saveProfileBtn'}[id];
    el.addEventListener('keydown', e => { if (e.key==='Enter') document.getElementById(saveId)?.click(); });
  });
}

document.addEventListener('DOMContentLoaded', init);
