/*  ================================================================
    PERSONAL DASHBOARD — app.js
    Vanilla JavaScript, no frameworks.
    Features  : Greeting (time/date), Focus Timer, To-Do List,
                Quick Links — all backed by localStorage.
    Challenges: 1) Light/Dark Mode
                2) Custom Name in Greeting
                3) Change Pomodoro Time
                4) Prevent Duplicate Tasks
                5) Sort Tasks
    ================================================================ */

'use strict';

/* ────────────────────────────────────────────────
   STORAGE HELPERS
──────────────────────────────────────────────── */
const store = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

/* ────────────────────────────────────────────────
   TOAST NOTIFICATIONS
──────────────────────────────────────────────── */
let _toastTimer = null;

function showToast(message, type = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = 'toast' + (type ? ' ' + type : '');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.add('hidden'); }, 2500);
}

/* ────────────────────────────────────────────────
   THEME — Challenge 1: Light / Dark Mode
──────────────────────────────────────────────── */
(function initTheme() {
  const saved = store.get('theme', 'dark');
  applyTheme(saved);

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
})();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
  store.set('theme', theme);
}

/* ────────────────────────────────────────────────
   GREETING — time, date, greeting text
   Challenge 2: Custom Name
──────────────────────────────────────────────── */
(function initGreeting() {
  updateGreeting();
  setInterval(updateGreeting, 1000);

  // Open name modal
  document.getElementById('openNameModal').addEventListener('click', openNameModal);
  document.getElementById('saveName').addEventListener('click', saveNameHandler);
  document.getElementById('cancelName').addEventListener('click', closeNameModal);

  // Close modal on overlay click
  document.getElementById('nameModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeNameModal();
  });
})();

function updateGreeting() {
  const now = new Date();

  // Time & Date string
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('dateTime').textContent = `${dateStr} · ${timeStr}`;

  // Greeting based on hour
  const hour = now.getHours();
  let greeting;
  if (hour < 12)      greeting = 'Good Morning';
  else if (hour < 17) greeting = 'Good Afternoon';
  else if (hour < 21) greeting = 'Good Evening';
  else                greeting = 'Good Night';

  // Custom name (Challenge 2)
  const name = store.get('userName', '');
  const nameStr = name ? `, <span>${escapeHtml(name)}</span>` : '';
  document.getElementById('greetingText').innerHTML = `${greeting}${nameStr} 👋`;
}

function openNameModal() {
  const name = store.get('userName', '');
  document.getElementById('nameInput').value = name;
  document.getElementById('nameModalOverlay').classList.remove('hidden');
  document.getElementById('nameInput').focus();
}

function closeNameModal() {
  document.getElementById('nameModalOverlay').classList.add('hidden');
}

function saveNameHandler() {
  const name = document.getElementById('nameInput').value.trim();
  store.set('userName', name);
  closeNameModal();
  updateGreeting();
  showToast(name ? `Hey, ${name}! 👋` : 'Name cleared.', 'success');
}

/* ────────────────────────────────────────────────
   FOCUS TIMER
   Challenge 3: Change Pomodoro Time
──────────────────────────────────────────────── */
let timerInterval  = null;
let timerRunning   = false;
let timerTotalSecs = 25 * 60;
let timerRemaining = timerTotalSecs;

(function initTimer() {
  const savedMin = store.get('pomoDuration', 25);
  document.getElementById('pomoDuration').value = savedMin;
  timerTotalSecs = savedMin * 60;
  timerRemaining = timerTotalSecs;
  renderTimer();

  document.getElementById('applyDuration').addEventListener('click', applyDuration);
  document.getElementById('timerStart').addEventListener('click',  startTimer);
  document.getElementById('timerStop').addEventListener('click',   stopTimer);
  document.getElementById('timerReset').addEventListener('click',  resetTimer);

  // Allow pressing Enter in duration input
  document.getElementById('pomoDuration').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyDuration();
  });
})();

function applyDuration() {
  if (timerRunning) {
    showToast('Stop the timer before changing duration.', 'error');
    return;
  }
  const raw = parseInt(document.getElementById('pomoDuration').value, 10);
  const min = isNaN(raw) || raw < 1 ? 1 : raw > 90 ? 90 : raw;
  document.getElementById('pomoDuration').value = min;
  store.set('pomoDuration', min);
  timerTotalSecs = min * 60;
  timerRemaining = timerTotalSecs;
  renderTimer();
  showToast(`Timer set to ${min} minute${min !== 1 ? 's' : ''}.`, 'success');
}

function startTimer() {
  if (timerRunning) return;
  if (timerRemaining <= 0) resetTimer();
  timerRunning = true;
  document.getElementById('timerDisplay').classList.add('running');
  document.getElementById('timerDisplay').classList.remove('finished');

  timerInterval = setInterval(() => {
    timerRemaining--;
    renderTimer();
    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      timerRunning = false;
      document.getElementById('timerDisplay').classList.remove('running');
      document.getElementById('timerDisplay').classList.add('finished');
      showToast('⏰ Time is up! Great focus session!', 'success');
    }
  }, 1000);
}

function stopTimer() {
  if (!timerRunning) return;
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById('timerDisplay').classList.remove('running');
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerRemaining = timerTotalSecs;
  const display = document.getElementById('timerDisplay');
  display.classList.remove('running', 'finished');
  renderTimer();
}

function renderTimer() {
  const m = Math.floor(timerRemaining / 60).toString().padStart(2, '0');
  const s = (timerRemaining % 60).toString().padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${m}:${s}`;
}

/* ────────────────────────────────────────────────
   TO-DO LIST
   Challenge 4: Prevent Duplicate Tasks
   Challenge 5: Sort Tasks
──────────────────────────────────────────────── */
let tasks      = store.get('tasks', []);     // [{id, text, done}]
let sortMode   = store.get('sortMode', 'default');
let editTaskId = null;

(function initTodo() {
  document.getElementById('todoAdd').addEventListener('click',  addTask);
  document.getElementById('todoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    if (btn.dataset.sort === sortMode) btn.classList.add('active');
    else btn.classList.remove('active');

    btn.addEventListener('click', () => {
      sortMode = btn.dataset.sort;
      store.set('sortMode', sortMode);
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    });
  });

  // Edit modal
  document.getElementById('saveEditTask').addEventListener('click',   saveEditTask);
  document.getElementById('cancelEditTask').addEventListener('click', closeEditModal);
  document.getElementById('editModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditModal();
  });
  document.getElementById('editTaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEditTask();
  });

  renderTasks();
})();

function addTask() {
  const input = document.getElementById('todoInput');
  const text  = input.value.trim();

  if (!text) {
    showToast('Please enter a task.', 'error');
    return;
  }

  // Challenge 4: Prevent duplicate (case-insensitive)
  const duplicate = tasks.some(t => t.text.toLowerCase() === text.toLowerCase());
  if (duplicate) {
    showToast('⚠️ That task already exists!', 'error');
    input.select();
    return;
  }

  tasks.push({ id: Date.now(), text, done: false });
  store.set('tasks', tasks);
  input.value = '';
  renderTasks();
  showToast('Task added!', 'success');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    store.set('tasks', tasks);
    renderTasks();
  }
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editTaskId = id;
  document.getElementById('editTaskInput').value = task.text;
  document.getElementById('editModalOverlay').classList.remove('hidden');
  document.getElementById('editTaskInput').focus();
}

function saveEditTask() {
  const newText = document.getElementById('editTaskInput').value.trim();
  if (!newText) {
    showToast('Task text cannot be empty.', 'error');
    return;
  }

  // Prevent duplicate on edit too
  const duplicate = tasks.some(t => t.id !== editTaskId && t.text.toLowerCase() === newText.toLowerCase());
  if (duplicate) {
    showToast('⚠️ Another task with that name already exists!', 'error');
    return;
  }

  const task = tasks.find(t => t.id === editTaskId);
  if (task) {
    task.text = newText;
    store.set('tasks', tasks);
    renderTasks();
    showToast('Task updated!', 'success');
  }
  closeEditModal();
}

function closeEditModal() {
  document.getElementById('editModalOverlay').classList.add('hidden');
  editTaskId = null;
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  store.set('tasks', tasks);
  renderTasks();
  showToast('Task deleted.', '');
}

function getSortedTasks() {
  const copy = [...tasks];
  if (sortMode === 'az') {
    copy.sort((a, b) => a.text.localeCompare(b.text));
  } else if (sortMode === 'done') {
    copy.sort((a, b) => Number(a.done) - Number(b.done));
  }
  return copy;
}

function renderTasks() {
  const list    = document.getElementById('todoList');
  const empty   = document.getElementById('todoEmpty');
  const sorted  = getSortedTasks();

  if (sorted.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = sorted.map(task => `
    <li class="todo-item${task.done ? ' done' : ''}" data-id="${task.id}">
      <input
        class="todo-checkbox"
        type="checkbox"
        ${task.done ? 'checked' : ''}
        aria-label="Mark task done"
        onchange="toggleTask(${task.id})"
      />
      <span class="todo-text">${escapeHtml(task.text)}</span>
      <div class="todo-actions">
        <button class="btn-icon" title="Edit" onclick="openEditModal(${task.id})">✏️</button>
        <button class="btn-icon delete" title="Delete" onclick="deleteTask(${task.id})">🗑</button>
      </div>
    </li>
  `).join('');
}

/* ────────────────────────────────────────────────
   QUICK LINKS
──────────────────────────────────────────────── */
let links      = store.get('links', []);   // [{id, name, url}]
let editLinkId = null;

(function initLinks() {
  document.getElementById('linkAdd').addEventListener('click', addLink);

  // Allow Enter on URL input
  document.getElementById('linkUrl').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addLink();
  });

  // Edit modal
  document.getElementById('saveEditLink').addEventListener('click',   saveEditLink);
  document.getElementById('cancelEditLink').addEventListener('click', closeEditLinkModal);
  document.getElementById('editLinkModalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeEditLinkModal();
  });

  renderLinks();
})();

function addLink() {
  const nameEl = document.getElementById('linkName');
  const urlEl  = document.getElementById('linkUrl');
  const name   = nameEl.value.trim();
  const url    = urlEl.value.trim();

  if (!name) { showToast('Please enter a label.', 'error'); nameEl.focus(); return; }
  if (!url)  { showToast('Please enter a URL.', 'error');   urlEl.focus();  return; }

  const normalised = ensureProtocol(url);
  if (!isValidUrl(normalised)) {
    showToast('Please enter a valid URL.', 'error');
    urlEl.focus();
    return;
  }

  links.push({ id: Date.now(), name, url: normalised });
  store.set('links', links);
  nameEl.value = '';
  urlEl.value  = '';
  renderLinks();
  showToast('Link added!', 'success');
}

function openEditLinkModal(id) {
  const link = links.find(l => l.id === id);
  if (!link) return;
  editLinkId = id;
  document.getElementById('editLinkName').value = link.name;
  document.getElementById('editLinkUrl').value  = link.url;
  document.getElementById('editLinkModalOverlay').classList.remove('hidden');
  document.getElementById('editLinkName').focus();
}

function saveEditLink() {
  const name = document.getElementById('editLinkName').value.trim();
  const url  = ensureProtocol(document.getElementById('editLinkUrl').value.trim());

  if (!name) { showToast('Label cannot be empty.', 'error'); return; }
  if (!isValidUrl(url)) { showToast('Please enter a valid URL.', 'error'); return; }

  const link = links.find(l => l.id === editLinkId);
  if (link) {
    link.name = name;
    link.url  = url;
    store.set('links', links);
    renderLinks();
    showToast('Link updated!', 'success');
  }
  closeEditLinkModal();
}

function closeEditLinkModal() {
  document.getElementById('editLinkModalOverlay').classList.add('hidden');
  editLinkId = null;
}

function deleteLink(id) {
  links = links.filter(l => l.id !== id);
  store.set('links', links);
  renderLinks();
  showToast('Link deleted.', '');
}

function renderLinks() {
  const grid  = document.getElementById('linksGrid');
  const empty = document.getElementById('linksEmpty');

  if (links.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = links.map(link => {
    const favicon = getFaviconUrl(link.url);
    return `
      <div class="link-item" data-id="${link.id}">
        <!-- Controls overlay -->
        <div class="link-controls">
          <button class="link-ctrl-btn" title="Edit" onclick="openEditLinkModal(${link.id}); event.preventDefault();">✏️</button>
          <button class="link-ctrl-btn del" title="Delete" onclick="deleteLink(${link.id}); event.preventDefault();">✕</button>
        </div>

        <!-- Clickable anchor fills card -->
        <a href="${escapeAttr(link.url)}" target="_blank" rel="noopener noreferrer"
           style="display:contents; text-decoration:none;" onclick="event.stopPropagation()">
          <div class="link-favicon">
            <img src="${favicon}" alt="" loading="lazy"
                 onerror="this.style.display='none'; this.parentElement.textContent='🔗';" />
          </div>
          <span class="link-label">${escapeHtml(link.name)}</span>
        </a>
      </div>
    `;
  }).join('');

  // Make entire card clickable (except controls)
  grid.querySelectorAll('.link-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.link-controls')) return;
      const link = links.find(l => l.id === Number(item.dataset.id));
      if (link) window.open(link.url, '_blank', 'noopener,noreferrer');
    });
  });
}

/* ────────────────────────────────────────────────
   UTILITIES
──────────────────────────────────────────────── */
function getFaviconUrl(url) {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=32`;
  } catch {
    return '';
  }
}

function ensureProtocol(url) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
