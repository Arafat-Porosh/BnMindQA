// ─────────────────────────────────────────────────────────────────────────────
//  Bengali Mental Health QA — Frontend Application Logic
// ─────────────────────────────────────────────────────────────────────────────

// ── State ──────────────────────────────────────────────────────────────────────
const STATE = {
  apiBase: localStorage.getItem('apiBase') || '',
  connected: false,
  isLoading: false,
  messages: [],            // { role: 'user'|'ai', content, sources, latency }
  chatHistory: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
  currentSources: [],
};

// ── DOM Elements ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const els = {
  settingsModal:         $('settingsModal'),
  apiUrlInput:           $('apiUrlInput'),
  connectionStatus:      $('connectionStatus'),
  statusDot:             $('statusDot'),
  statusText:            $('statusText'),
  testConnectionBtn:     $('testConnectionBtn'),
  saveSettingsBtn:       $('saveSettingsBtn'),
  openSettingsBtn:       $('openSettingsBtn'),
  openSettingsBtnWelcome:$('openSettingsBtnWelcome'),
  newChatBtn:            $('newChatBtn'),
  chatHistory:           $('chatHistory'),
  infoModel:             $('infoModel'),
  infoChunks:            $('infoChunks'),
  connDot:               $('connDot'),
  connLabel:             $('connLabel'),
  sidebarToggle:         $('sidebarToggle'),
  sidebar:               document.querySelector('.sidebar'),
  chatArea:              $('chatArea'),
  welcomeScreen:         $('welcomeScreen'),
  setupNotice:           $('setupNotice'),
  messagesContainer:     $('messagesContainer'),
  questionInput:         $('questionInput'),
  sendBtn:               $('sendBtn'),
  topBadgeDot:           $('topBadgeDot'),
  topBadgeText:          $('topBadgeText'),
  sourcePanel:           $('sourcePanel'),
  sourcePanelBody:       $('sourcePanelBody'),
  closeSourcePanel:      $('closeSourcePanel'),
  panelOverlay:          $('panelOverlay'),
};

// ── API Helpers ────────────────────────────────────────────────────────────────
// Common headers — ngrok-skip-browser-warning bypasses ngrok's interstitial page
const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

async function apiGet(path) {
  const url = `${STATE.apiBase}${path}`;
  const resp = await fetch(url, { method: 'GET', headers: COMMON_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function apiPost(path, body) {
  const url = `${STATE.apiBase}${path}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── Connection Management ──────────────────────────────────────────────────────
async function checkConnection(showFeedback = false) {
  if (!STATE.apiBase) {
    setConnectionState(false);
    return false;
  }
  try {
    const data = await apiGet('/api/health');
    setConnectionState(true, data);
    if (showFeedback) showToast('✅ সংযোগ সফল!', 'success');
    return true;
  } catch (e) {
    console.error('Health check failed:', e);
    setConnectionState(false);
    if (showFeedback) showToast('❌ সংযোগ ব্যর্থ। URL পরীক্ষা করুন।');
    return false;
  }
}

function setConnectionState(online, data = null) {
  STATE.connected = online;

  // Topbar badge
  els.topBadgeDot.className = 'badge-dot' + (online ? ' online' : '');
  els.topBadgeText.textContent = online ? 'সংযুক্ত' : 'অফলাইন';

  // Sidebar status
  els.connDot.className = 'info-dot' + (online ? ' online' : '');
  els.connLabel.textContent = online ? 'সংযুক্ত' : 'সংযুক্ত নয়';

  // System info
  if (data) {
    const modelName = (data.model || '').split('/').pop() || '—';
    els.infoModel.textContent = modelName;
    els.infoModel.title = data.model || '';
    els.infoChunks.textContent = data.chunks ? `${data.chunks.toLocaleString()} চাংক` : '—';
  }

  // Welcome screen notice
  if (online) {
    els.setupNotice.classList.add('connected');
    els.setupNotice.innerHTML = `
      <div class="notice-icon">✅</div>
      <div><strong>API সংযুক্ত</strong><p>মডেল প্রস্তুত। প্রশ্ন জিজ্ঞেস করুন।</p></div>`;
  } else {
    els.setupNotice.classList.remove('connected');
    els.setupNotice.innerHTML = `
      <div class="notice-icon">⚙️</div>
      <div>
        <strong>প্রথমে API সংযোগ করুন</strong>
        <p>Kaggle নোটবুক চালু করে ngrok URL সেটিংসে পেস্ট করুন।</p>
      </div>
      <button class="btn btn-sm btn-primary" onclick="openSettings()">সেটিংস খুলুন</button>`;
  }

  // Send button
  updateSendBtn();
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function openSettings() {
  els.settingsModal.classList.remove('hidden');
  els.apiUrlInput.value = STATE.apiBase;
  resetModalStatus();
}

function closeSettings() {
  els.settingsModal.classList.add('hidden');
}

function resetModalStatus() {
  els.statusDot.className = 'status-dot';
  els.statusText.textContent = 'সংযোগ পরীক্ষা করা হয়নি';
}

els.openSettingsBtn.addEventListener('click', openSettings);
els.openSettingsBtnWelcome && els.openSettingsBtnWelcome.addEventListener('click', openSettings);
els.settingsModal.addEventListener('click', e => { if (e.target === els.settingsModal) closeSettings(); });

els.testConnectionBtn.addEventListener('click', async () => {
  const url = els.apiUrlInput.value.trim().replace(/\/$/, '');
  if (!url) { showToast('URL লিখুন'); return; }

  els.statusDot.className = 'status-dot checking';
  els.statusText.textContent = 'সংযোগ পরীক্ষা করা হচ্ছে…';
  els.testConnectionBtn.disabled = true;

  try {
    const resp = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: COMMON_HEADERS,
    });
    const data = await resp.json();
    els.statusDot.className = 'status-dot success';
    const modelName = (data.model || '').split('/').pop() || 'অজানা';
    els.statusText.textContent = `✅ সংযুক্ত — ${modelName} | ${(data.chunks || 0).toLocaleString()} চাংক`;
  } catch (e) {
    els.statusDot.className = 'status-dot error';
    els.statusText.textContent = `❌ সংযোগ ব্যর্থ: ${e.message}`;
    console.error('Test connection failed:', e);
  } finally {
    els.testConnectionBtn.disabled = false;
  }
});

els.saveSettingsBtn.addEventListener('click', async () => {
  const url = els.apiUrlInput.value.trim().replace(/\/$/, '');
  STATE.apiBase = url;
  localStorage.setItem('apiBase', url);
  closeSettings();
  await checkConnection(true);
});

// ── Sidebar ────────────────────────────────────────────────────────────────────
els.sidebarToggle.addEventListener('click', () => {
  els.sidebar.classList.toggle('open');
});
els.panelOverlay.addEventListener('click', () => {
  closeSourcePanel();
  els.sidebar.classList.remove('open');
});

// ── New Chat ───────────────────────────────────────────────────────────────────
els.newChatBtn.addEventListener('click', () => {
  if (STATE.messages.length > 0) {
    saveChatToHistory();
  }
  STATE.messages = [];
  els.messagesContainer.innerHTML = '';
  showWelcome(true);
  els.sidebar.classList.remove('open');
});

function saveChatToHistory() {
  if (STATE.messages.length === 0) return;
  const firstUserMsg = STATE.messages.find(m => m.role === 'user');
  if (!firstUserMsg) return;
  const item = {
    id: Date.now(),
    title: firstUserMsg.content.substring(0, 50),
    timestamp: new Date().toLocaleTimeString('bn-BD'),
    messages: [...STATE.messages],
  };
  STATE.chatHistory.unshift(item);
  if (STATE.chatHistory.length > 20) STATE.chatHistory.pop();
  localStorage.setItem('chatHistory', JSON.stringify(STATE.chatHistory));
  renderHistoryList();
}

function renderHistoryList() {
  const container = els.chatHistory;
  const label = container.querySelector('.history-label');
  // Keep label, remove old items
  const items = container.querySelectorAll('.history-item');
  items.forEach(i => i.remove());

  STATE.chatHistory.forEach(chat => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.textContent = chat.title;
    div.title = chat.title;
    div.addEventListener('click', () => loadChatFromHistory(chat));
    container.appendChild(div);
  });
}

function loadChatFromHistory(chat) {
  STATE.messages = [...chat.messages];
  els.messagesContainer.innerHTML = '';
  showWelcome(false);
  chat.messages.forEach(msg => {
    if (msg.role === 'user') appendUserMessage(msg.content);
    else if (msg.role === 'ai') appendAIMessage(msg.content, msg.sources || [], msg.latency || null, false);
  });
  scrollToBottom();
  els.sidebar.classList.remove('open');
}

// ── Welcome / Chat View ────────────────────────────────────────────────────────
function showWelcome(show) {
  els.welcomeScreen.style.display = show ? 'flex' : 'none';
  els.messagesContainer.style.display = show ? 'none' : 'flex';
}

// Suggestion cards
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const q = card.dataset.q;
    els.questionInput.value = q;
    updateSendBtn();
    handleSend();
  });
});

// ── Input Handling ─────────────────────────────────────────────────────────────
els.questionInput.addEventListener('input', () => {
  autoResizeTextarea();
  updateSendBtn();
});

els.questionInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!STATE.isLoading && STATE.connected) handleSend();
  }
});

els.sendBtn.addEventListener('click', handleSend);

function autoResizeTextarea() {
  const ta = els.questionInput;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
}

function updateSendBtn() {
  const hasText = els.questionInput.value.trim().length > 0;
  els.sendBtn.disabled = !hasText || STATE.isLoading || !STATE.connected;
}

// ── Send & Query ───────────────────────────────────────────────────────────────
async function handleSend() {
  const question = els.questionInput.value.trim();
  if (!question || STATE.isLoading) return;

  if (!STATE.connected) {
    showToast('⚙️ প্রথমে API সংযোগ করুন');
    openSettings();
    return;
  }

  // Hide welcome, show messages
  showWelcome(false);

  // Add user message
  STATE.messages.push({ role: 'user', content: question });
  appendUserMessage(question);

  // Clear input
  els.questionInput.value = '';
  els.questionInput.style.height = 'auto';
  updateSendBtn();

  // Show thinking indicator
  const thinkingId = appendThinkingIndicator();
  STATE.isLoading = true;
  setSendLoading(true);

  try {
    const result = await apiPost('/api/chat', { question });

    // Remove thinking indicator
    removeThinkingIndicator(thinkingId);

    const aiMsg = {
      role: 'ai',
      content: result.answer,
      sources: result.sources || [],
      latency: result.total_latency_s,
    };
    STATE.messages.push(aiMsg);
    appendAIMessage(result.answer, result.sources || [], result.total_latency_s, true);

  } catch (err) {
    removeThinkingIndicator(thinkingId);
    const errMsg = `❌ ত্রুটি: ${err.message}`;
    STATE.messages.push({ role: 'ai', content: errMsg, sources: [] });
    appendAIMessage(errMsg, [], null, true);
    showToast(errMsg);
  } finally {
    STATE.isLoading = false;
    setSendLoading(false);
    updateSendBtn();
    scrollToBottom();
  }
}

function setSendLoading(loading) {
  const btn = els.sendBtn;
  if (loading) {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"><animate attributeName="stroke-dashoffset" values="32;0" dur="1s" repeatCount="indefinite"/></circle></svg>`;
    btn.disabled = true;
    btn.classList.add('loading');
  } else {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
    btn.classList.remove('loading');
  }
}

// ── Message Rendering ──────────────────────────────────────────────────────────
function appendUserMessage(text) {
  const block = document.createElement('div');
  block.className = 'message-block';
  block.innerHTML = `
    <div class="msg-user">
      <div class="bubble">${escapeHtml(text)}</div>
    </div>`;
  els.messagesContainer.appendChild(block);
  scrollToBottom();
}

function appendThinkingIndicator() {
  const id = 'thinking-' + Date.now();
  const block = document.createElement('div');
  block.className = 'message-block';
  block.id = id;
  block.innerHTML = `
    <div class="msg-ai">
      <div class="avatar">🧠</div>
      <div class="bubble-wrap">
        <div class="bubble thinking">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <span style="font-family:var(--font-bengali)">উত্তর তৈরি করা হচ্ছে…</span>
        </div>
      </div>
    </div>`;
  els.messagesContainer.appendChild(block);
  scrollToBottom();
  return id;
}

function removeThinkingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function appendAIMessage(text, sources, latency, animate) {
  const block = document.createElement('div');
  block.className = 'message-block';
  if (animate) block.style.animation = 'fadeInUp 0.3s ease';

  const sourceChips = sources.length > 0
    ? `<div class="source-preview">
        ${sources.slice(0, 3).map((s, i) => `
          <button class="source-chip" onclick="openSourcePanel(${i})" data-msg-sources='${escapeAttr(JSON.stringify(sources))}'>
            <span class="chip-icon">📖</span>
            ${escapeHtml(s.source_book || 'উৎস ' + (i+1))}
          </button>`).join('')}
        ${sources.length > 3 ? `<button class="source-chip" onclick="openSourcePanel(0)" data-msg-sources='${escapeAttr(JSON.stringify(sources))}'>+${sources.length-3} আরও</button>` : ''}
      </div>` : '';

  const latencyTag = latency != null
    ? `<span class="latency-tag">⏱ ${latency}s</span>` : '';

  block.innerHTML = `
    <div class="msg-ai">
      <div class="avatar">🧠</div>
      <div class="bubble-wrap">
        <div class="bubble">${escapeHtml(text)}</div>
        ${sourceChips}
        <div class="msg-actions">
          <button class="action-btn" onclick="copyToClipboard('${escapeAttr(text)}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            কপি করুন
          </button>
          ${sources.length > 0 ? `<button class="action-btn" onclick="openSourcePanel(0, this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            ${sources.length} তথ্যসূত্র
          </button>` : ''}
          ${latencyTag}
        </div>
      </div>
    </div>`;

  // Store sources on source buttons
  if (sources.length > 0) {
    block.setAttribute('data-sources', JSON.stringify(sources));
  }

  els.messagesContainer.appendChild(block);
  scrollToBottom();
}

// ── Source Panel ───────────────────────────────────────────────────────────────
function openSourcePanel(startIndex = 0, btn = null) {
  // Find closest message block with sources
  let sources = STATE.currentSources;

  if (btn) {
    const block = btn.closest('.message-block');
    if (block && block.dataset.sources) {
      sources = JSON.parse(block.dataset.sources);
    }
  }

  // Check source chips
  const chipBtn = (btn && btn.classList.contains('source-chip')) ? btn : null;
  if (chipBtn && chipBtn.dataset.msgSources) {
    try { sources = JSON.parse(chipBtn.dataset.msgSources); } catch(e){}
  }

  if (!sources || sources.length === 0) return;

  STATE.currentSources = sources;
  renderSourcePanel(sources);
  els.sourcePanel.classList.add('open');
  els.panelOverlay.classList.add('visible');
}

function closeSourcePanel() {
  els.sourcePanel.classList.remove('open');
  els.panelOverlay.classList.remove('visible');
}

els.closeSourcePanel.addEventListener('click', closeSourcePanel);

function renderSourcePanel(sources) {
  els.sourcePanelBody.innerHTML = '';
  sources.forEach((src, i) => {
    const card = document.createElement('div');
    card.className = 'source-card';

    const scoreBar = src.rerank_score !== undefined
      ? `<div class="source-rank">স্কোর: ${src.rerank_score.toFixed(4)}</div>` : '';

    const chapter = src.chapter
      ? `<span>📖 ${escapeHtml(src.chapter.substring(0, 60))}</span>` : '';
    const section = src.section
      ? `<span>📄 ${escapeHtml(src.section.substring(0, 60))}</span>` : '';

    card.innerHTML = `
      <div class="source-card-header">
        <div class="source-book-name">📚 ${escapeHtml(src.source_book || 'অজানা উৎস')}</div>
        <div class="source-meta" style="display:flex;flex-direction:column;gap:2px">
          ${chapter}${section}
        </div>
        ${scoreBar}
      </div>
      <div class="source-snippet">${escapeHtml((src.text_snippet || '').substring(0, 400))}…</div>`;
    els.sourcePanelBody.appendChild(card);
  });
}

// ── Utilities ──────────────────────────────────────────────────────────────────
function scrollToBottom() {
  setTimeout(() => {
    els.chatArea.scrollTo({ top: els.chatArea.scrollHeight, behavior: 'smooth' });
  }, 50);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ ক্লিপবোর্ডে কপি হয়েছে', 'success');
  }).catch(() => {
    showToast('কপি করা যায়নি');
  });
}

// ── Toast ──────────────────────────────────────────────────────────────────────
let toastTimeout;
function showToast(message, type = 'error') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  // Restore UI
  showWelcome(true);
  renderHistoryList();

  // Set API URL input
  if (STATE.apiBase) {
    els.apiUrlInput.value = STATE.apiBase;
  }

  // Check connection
  if (STATE.apiBase) {
    await checkConnection(false);
  } else {
    setConnectionState(false);
  }

  // If no API configured, auto-open settings after short delay
  if (!STATE.apiBase) {
    setTimeout(() => openSettings(), 800);
  }

  // Listen for keyboard shortcut: Ctrl+, to open settings
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === ',') { e.preventDefault(); openSettings(); }
    if (e.key === 'Escape') {
      closeSettings();
      closeSourcePanel();
      els.sidebar.classList.remove('open');
    }
  });
}

init();
