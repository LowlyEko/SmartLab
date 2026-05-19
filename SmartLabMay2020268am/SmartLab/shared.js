(function () {
  "use strict";

  const sidebar = document.querySelector(".sidebar");
  const toggle  = document.querySelector(".toggle");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("close"));
  }

  const toggleSwitch = document.querySelector(".toggle-switch");
  const modeText     = document.querySelector(".mode-text");

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if (modeText) modeText.textContent = "Light Mode";
  }

  if (toggleSwitch) {
    toggleSwitch.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      if (modeText) modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  const profileBtn = document.querySelector(".profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", e => {
      e.stopPropagation();
      profileBtn.classList.toggle("active");
    });
    document.addEventListener("click", () => profileBtn.classList.remove("active"));
  }

  const filename = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-link a[data-page]").forEach(link => {
    const page = link.getAttribute("data-page");
    if (filename.includes(page)) {
      link.classList.add("active");
    }
  });

})();

const profilePanel = document.getElementById('profilePanel');
document.querySelector('.profile')?.addEventListener('click', (e) => {
  e.stopPropagation();
  profilePanel?.classList.toggle('open');
  msgPanel?.classList.remove('open');
});
document.addEventListener('click', () => profilePanel?.classList.remove('open'));

// ===== Messages Panel =====
const msgPanel    = document.getElementById('msgPanel');
const msgToggle   = document.getElementById('msgToggle');
const msgBadge    = document.getElementById('msgBadge');
const mpSearch    = document.getElementById('mpSearch');
const mpNoResults = document.getElementById('mpNoResults');
const viewAllBtn  = document.getElementById('viewAllBtn');
const mpTabs      = document.querySelectorAll('.mp-tab');
const mpItems     = document.querySelectorAll('.mp-item[data-type]');

let activeTab  = 'all';
let isExpanded = false;

function filterMessages() {
  const q = mpSearch ? mpSearch.value.toLowerCase().trim() : '';
  let visible = 0;

  mpItems.forEach(item => {
    const type     = item.dataset.type;
    const name     = (item.dataset.name || '').toLowerCase();
    const text     = item.querySelector('.mp-text')?.textContent.toLowerCase() || '';
    const isUnread = item.classList.contains('unread');

    let tabMatch = true;
    if (activeTab === 'unread')      tabMatch = isUnread;
    else if (activeTab === 'groups') tabMatch = type === 'group';

    const searchMatch = !q || name.includes(q) || text.includes(q);
    const show = tabMatch && searchMatch;

    item.classList.toggle('mp-hidden', !show);
    if (show) visible++;
  });

  if (mpNoResults) mpNoResults.style.display = visible === 0 ? 'block' : 'none';
}

if (mpTabs.length) {
  mpTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mpTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.tab;
      filterMessages();
    });
  });
}

if (mpSearch) mpSearch.addEventListener('input', filterMessages);

if (msgToggle && msgPanel) {
  const msgIcon = msgToggle.querySelector('.fa-comment');

  msgToggle.addEventListener('click', e => {
    e.stopPropagation();
    msgPanel.classList.toggle('open');
    document.getElementById('profilePanel')?.classList.remove('open');

    // Toggle gold color on the icon
    msgIcon?.classList.toggle('active', msgPanel.classList.contains('open'));
  });

  document.addEventListener('click', () => {
    msgPanel.classList.remove('open');
    msgIcon?.classList.remove('active');
  });

  msgPanel.addEventListener('click', e => e.stopPropagation());
}

// ===== Predefined conversation stubs per contact =====
const contactConversations = {
  'Maria Cruz': [
    { from: 'them', text: 'Hi! Is the microscope set available?' },
    { from: 'me',   text: 'Yes, it is! When do you need it?' },
    { from: 'them', text: 'Can I borrow the microscope set for Friday?' },
  ],
  'Rodel Lim': [
    { from: 'them', text: 'Hi, I submitted a reservation request.' },
    { from: 'me',   text: 'Got it, let me check the calendar.' },
    { from: 'them', text: 'The centrifuge reservation is confirmed.' },
  ],
  'Ana Jimenez': [
    { from: 'me',   text: 'Ana, please send a damage report for Beaker #4.' },
    { from: 'them', text: 'Damage report for Beaker #4 submitted.' },
  ],
  'Karl Buenaventura': [
    { from: 'them', text: 'I returned the equipment earlier today.' },
    { from: 'me',   text: 'Thanks Karl!' },
    { from: 'them', text: 'Equipment return logged successfully.' },
  ],
  'CAS Lab Team': [
    { from: 'them', text: 'Everyone please check the updated guidelines.' },
    { from: 'me',   text: 'Noted, thanks!' },
    { from: 'them', text: 'Juan: Schedule for next week is posted.' },
  ],
  'Reservation Alerts': [
    { from: 'them', text: '5 reservations were approved yesterday.' },
    { from: 'them', text: '3 new reservations pending approval today.' },
  ],
  'Science Department': [
    { from: 'them', text: 'Please prepare for the annual inventory check.' },
    { from: 'them', text: 'Reminder: Annual inventory check on May 10.' },
  ],
};

// =====================================================
// POPUP QUEUE MANAGER
// Max 2 visible at a time.
// popupQueue : [id, ...] — index 0 = leftmost (newest), last = rightmost (oldest)
// stackQueue : [id, ...] — index 0 = oldest (bottom of dock), last = newest (top of dock)
// Circular rotation: opening/restoring a chat pushes the rightmost visible to the TOP of the stack.
// =====================================================
const MAX_POPUPS  = 2;
const POPUP_WIDTH = 337;
const POPUP_GAP   = 10;
const BASE_RIGHT  = 80;

let popupQueue = [];   // currently visible popups, left-to-right = newest-to-oldest
let stackQueue = [];   // minimized/stacked popups, index 0 = bottom of dock, last = top of dock

// Map of popupId -> { name, initials, avatarColor, isCompose }
const minimizedChats = new Map();

// ── Reposition all visible popups ──────────────────────────────────────────
function reindexPopups() {
  popupQueue.forEach((id, index) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.right = (BASE_RIGHT + index * (POPUP_WIDTH + POPUP_GAP)) + 'px';
    }
  });
  renderMinimizedDock();
}

// ── Push the rightmost visible popup onto the top of the stack ─────────────
function evictOldestToStack() {
  if (popupQueue.length === 0) return;
  const evictId = popupQueue[popupQueue.length - 1];
  const el      = document.getElementById(evictId);
  if (el) {
    el.classList.remove('open');
    el.style.display = 'none';
  }
  popupQueue.splice(popupQueue.length - 1, 1);
  stackQueue.unshift(evictId); // goes to BOTTOM of dock (index 0)
}

// ── If a slot is free and stack has chats, pull the top of stack into view ──
// ── If a slot is free and stack has chats, pull the top of stack into view ──
function fillFromStack() {
  if (popupQueue.length >= MAX_POPUPS) return;
  if (stackQueue.length === 0) return;

  const nextId = stackQueue[stackQueue.length - 1];

  // Safety: skip if somehow already visible
  if (popupQueue.includes(nextId)) {
    stackQueue.pop();
    fillFromStack();
    return;
  }

  stackQueue.pop();
  const el = document.getElementById(nextId);
  if (!el) { fillFromStack(); return; } // orphaned, skip

  popupQueue.push(nextId);
  el.classList.add('open');
  el.style.display = '';
  reindexPopups();
}

// ── Register a popup as visible (called on open or restore from stack) ──────
function registerPopup(id) {
  // Remove from stack if it was stacked
  const si = stackQueue.indexOf(id);
  if (si !== -1) stackQueue.splice(si, 1);

  // Already visible — promote to front (leftmost)
  const qi = popupQueue.indexOf(id);
  if (qi !== -1) {
    popupQueue.splice(qi, 1);
    popupQueue.unshift(id);
    reindexPopups();
    return;
  }

  // Need to make room if at capacity — circular rotation
  if (popupQueue.length >= MAX_POPUPS) {
    evictOldestToStack();
  }

  popupQueue.unshift(id); // newest goes to front (leftmost position)
  reindexPopups();
}

// ── Unregister without stacking (used by close) ────────────────────────────
function unregisterPopup(id) {
  const qi = popupQueue.indexOf(id);
  if (qi !== -1) {
    popupQueue.splice(qi, 1);
    reindexPopups();
  }
  const si = stackQueue.indexOf(id);
  if (si !== -1) {
    stackQueue.splice(si, 1);
    renderMinimizedDock();
  }
}

// ── Permanently remove a popup — auto-fill vacant slot from stack ───────────
function forceClosePopup(id) {
  unregisterPopup(id);
  const el = document.getElementById(id);
  if (el) el.remove();
  minimizedChats.delete(id);
  fillFromStack(); // fill the vacant slot if stack has chats
  renderMinimizedDock();
}

// ── Minimize: move from visible to top of stack, then auto-fill ────────────
// ── Minimize: move from visible to BOTTOM of dock, NO auto-fill ────────────
function minimizePopup(id) {
  // Guard: already minimized
  if (stackQueue.includes(id)) return;

  // Remove from visible queue
  const qi = popupQueue.indexOf(id);
  if (qi !== -1) popupQueue.splice(qi, 1);

  // Hide the element
  const el = document.getElementById(id);
  if (el) { el.classList.remove('open'); el.style.display = 'none'; }

  // Push to BOTTOM of dock (unshift = index 0)
  stackQueue.unshift(id);

  // Reposition remaining visible popups and re-render dock
  reindexPopups();
}

// ── Restore from stack: circular rotation ──────────────────────────────────
function restoreFromStack(id) {
  registerPopup(id); // this handles eviction + positioning
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); el.style.display = ''; }
  renderMinimizedDock();
  el?.querySelector('.compose-chat-input, #composeToInput')?.focus();
}

// =====================================================
// MINIMIZED CHAT DOCK
// Vertical column on the right edge.
// stackQueue[0] = bottom of dock, stackQueue[last] = top of dock.
// flex-direction: column-reverse so appending in order gives bottom-to-top layout.
// =====================================================
function getMinimizedDock() {
  let dock = document.getElementById('minimizedChatDock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'minimizedChatDock';
    document.body.appendChild(dock);
  }
  return dock;
}

function renderMinimizedDock() {
  const dock = getMinimizedDock();
  dock.innerHTML = '';

  if (stackQueue.length === 0) return;

  stackQueue.forEach((popupId) => {
    const data = minimizedChats.get(popupId);
    if (!data) return;

    const item = document.createElement('div');
    item.className = 'minimized-dock-item';
    item.style.cssText = `
      position: relative;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${data.avatarColor || '#205e38'};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      font-family: "Poppins", sans-serif;
      cursor: pointer;
      pointer-events: all;
      box-shadow: 0 2px 8px rgba(0,0,0,0.28);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      user-select: none;
      overflow: visible;
      border: 2px solid rgba(255,255,255,0.15);
      animation: dock-item-in 0.2s ease both;
    `;

    if (data.isCompose) {
      item.innerHTML = '<i class="fa-solid fa-pen-to-square" style="font-size:18px;"></i>';
    } else {
      item.textContent = data.initials;
    }

    // ── Close button (shown on hover) ──────────────────────────────────────
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.title = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: -5px;
      right: -5px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      color: #080809;
      border: 2px solid #fff;
      font-size: 9px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.7);
      transition: opacity 0.15s ease, transform 0.15s ease;
      z-index: 10;
      pointer-events: all;
      padding: 0;
      font-family: "Poppins", sans-serif;
      font-weight: 700;
    `;

    item.appendChild(closeBtn);

    // Show/hide close button on hover
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'scale(1.1)';
      item.style.boxShadow = '0 4px 16px rgba(0,0,0,0.38)';
      closeBtn.style.opacity = '1';
      closeBtn.style.transform = 'scale(1)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.transform = 'scale(1)';
      item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.28)';
      closeBtn.style.opacity = '0';
      closeBtn.style.transform = 'scale(0.7)';
    });

    // Close button click — permanently remove
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent restoreFromStack
      forceClosePopup(popupId);
    });

    // Avatar click → restore
    item.addEventListener('click', () => restoreFromStack(popupId));

    // Tooltip label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      right: 56px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.75);
      color: #fff;
      font-size: 11px;
      font-family: "Poppins", sans-serif;
      font-weight: 500;
      padding: 4px 9px;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 9999;
    `;
    label.textContent = data.name;
    item.appendChild(label);
    item.addEventListener('mouseenter', () => { label.style.opacity = '1'; });
    item.addEventListener('mouseleave', () => { label.style.opacity = '0'; });

    dock.appendChild(item);
  });
}

// ===== Open chat popup from message panel item =====
function openChatFromItem(name, initials) {
  // Mark message as read
  const mpItem = document.querySelector(`.mp-item[data-name="${name}"]`);
  if (mpItem) {
    mpItem.classList.remove('unread');
    const dot = mpItem.querySelector('.mp-dot');
    if (dot) dot.remove();
    const unreadCount = document.querySelectorAll('.mp-item.unread').length;
    if (msgBadge) {
      msgBadge.style.display = unreadCount === 0 ? 'none' : 'flex';
      msgBadge.textContent   = unreadCount;
    }
  }

  msgPanel?.classList.remove('open');

  const avatarColors = {
    'Maria Cruz':          '#205e38',
    'Rodel Lim':           '#854d0e',
    'Ana Jimenez':         '#991b1b',
    'Karl Buenaventura':   '#205e38',
    'CAS Lab Team':        '#1e40af',
    'Reservation Alerts':  '#854d0e',
    'Science Department':  '#991b1b',
  };
  const avatarColor = avatarColors[name] || '#205e38';
  const popupId     = `chatPopup_${name.replace(/\s+/g, '_')}`;

  // Already exists — restore or promote
  if (document.getElementById(popupId)) {
    if (stackQueue.includes(popupId)) {
      restoreFromStack(popupId);
    } else {
      registerPopup(popupId);
      document.getElementById(popupId)?.querySelector('.compose-chat-input')?.focus();
    }
    return;
  }

  // ── Build new popup ──────────────────────────────────────────────────────
  const conversations = contactConversations[name] || [{ from: 'them', text: 'Hello!' }];

  const popup = document.createElement('div');
  popup.id        = popupId;
  popup.className = 'compose-popup';
  popup.style.cssText = `position:fixed;bottom:0;right:${BASE_RIGHT}px;z-index:100;`;
  popup.innerHTML = `
    <div class="compose-header" id="composeHeader_${popupId}">
      <div style="display:flex;align-items:center;gap:8px;">
        <div class="compose-sug-av"
             style="width:28px;height:28px;font-size:10px;background:rgba(255,255,255,0.2);color:#fff;
                    border-radius:50%;display:flex;align-items:center;justify-content:center;
                    font-weight:700;flex-shrink:0;">${initials}</div>
        <span class="compose-title">${name}</span>
      </div>
      <div class="compose-actions" style="display:flex;gap:6px;align-items:center;">
        <button class="compose-btn" id="minimizeBtn_${popupId}" title="Minimize">&#8722;</button>
        <button class="compose-btn" id="closeBtn_${popupId}"   title="Close">&#10005;</button>
      </div>
    </div>
    <div class="compose-body" id="composeBody_${popupId}">
      <div class="compose-chat-area"   id="chatArea_${popupId}"></div>
      <div class="compose-chat-footer" id="chatFooter_${popupId}">
        <button class="compose-chat-tool mic-btn" id="micBtn_${popupId}" title="Voice message">
          <i class="fa-solid fa-microphone"></i>
        </button>
        <button class="compose-chat-tool" title="Attach"><i class="fa-solid fa-paperclip"></i></button>
        <button class="compose-chat-tool" title="Emoji"><i class="fa-regular fa-face-smile"></i></button>
        <input  class="compose-chat-input" id="chatInput_${popupId}" type="text" placeholder="Aa">
        <button class="compose-chat-send" id="chatSend_${popupId}" title="Send">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Register in minimized map
  minimizedChats.set(popupId, { name, initials, avatarColor });

  registerPopup(popupId);
  popup.classList.add('open');

  // ── Populate conversation history ────────────────────────────────────────
  const chatArea = popup.querySelector(`#chatArea_${popupId}`);
  conversations.forEach(msg => {
    const row = document.createElement('div');
    row.className = `chat-msg-row ${msg.from === 'me' ? 'sent' : 'received'}`;
    row.innerHTML  = msg.from === 'them'
      ? `<div class="chat-msg-av">${initials}</div><div class="chat-msg-bubble">${msg.text}</div>`
      : `<div class="chat-msg-bubble">${msg.text}</div>`;
    chatArea.appendChild(row);
  });
  chatArea.scrollTop = chatArea.scrollHeight;

  // ── Helpers ──────────────────────────────────────────────────────────────
  function fmtTime(s) {
    return Math.floor(s / 60).toString().padStart(2, '0') + ':' + (s % 60).toString().padStart(2, '0');
  }

  function buildRecordingBar() {
    const bar = document.createElement('div');
    bar.className = 'voice-recording-bar';
    bar.innerHTML = `
      <button class="vr-cancel" id="vrCancel_${popupId}" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
      <button class="vr-stop"   id="vrStop_${popupId}"   title="Stop"><span class="vr-stop-icon"></span></button>
      <div class="vr-track">
        <div class="vr-bars">
          ${'<div class="vr-bar"></div>'.repeat(8)}
        </div>
        <span class="vr-timer" id="vrTimer_${popupId}">0:00</span>
      </div>
      <button class="vr-send" id="vrSendDirect_${popupId}" title="Send now">
        <i class="fa-solid fa-paper-plane"></i>
      </button>`;
    return bar;
  }

  function buildReviewBar(audioUrl, duration) {
    const bar = document.createElement('div');
    bar.className = 'voice-recording-bar voice-review-bar';
    const staticBars = Array.from({ length: 14 }, () => {
      const h = 5 + Math.round(Math.random() * 14);
      return `<div class="vr-bar" style="animation:none;height:${h}px;opacity:0.6;"></div>`;
    }).join('');
    bar.innerHTML = `
      <button class="vr-cancel vr-discard" id="vrDiscard_${popupId}"     title="Discard"><i class="fa-solid fa-trash-can"></i></button>
      <button class="vr-play-preview"      id="vrPlayPreview_${popupId}" title="Preview"><i class="fa-solid fa-play"></i></button>
      <div class="vr-track">
        <div class="vr-bars">${staticBars}</div>
        <span class="vr-timer" id="vrReviewTimer_${popupId}">${fmtTime(duration)}</span>
      </div>
      <button class="vr-send" id="vrConfirmSend_${popupId}" title="Send"><i class="fa-solid fa-paper-plane"></i></button>`;
    return bar;
  }

  const chatFooter = popup.querySelector(`#chatFooter_${popupId}`);
  const chatInput  = popup.querySelector(`#chatInput_${popupId}`);
  const chatSend   = popup.querySelector(`#chatSend_${popupId}`);
  const micBtn     = popup.querySelector(`#micBtn_${popupId}`);
  const body       = popup.querySelector(`#composeBody_${popupId}`);

  let mediaRecorder = null, audioChunks = [], recTimerID = null, recSeconds = 0;
  let recBar = null, reviewBar = null, previewAudio = null, previewPlaying = false;

  function restoreFooter() {
    clearInterval(recTimerID); recTimerID = null; recSeconds = 0;
    micBtn?.classList.remove('is-recording');
    recBar?.remove();    recBar    = null;
    reviewBar?.remove(); reviewBar = null;
    if (previewAudio) { previewAudio.pause(); previewAudio = null; previewPlaying = false; }
    chatFooter.style.display = 'flex';
  }

  function appendVoiceMessage(audioUrl, duration) {
    const bars = Array.from({ length: 20 }, () => {
      const h = 4 + Math.round(Math.random() * 16);
      return `<div class="vm-wave-bar" style="height:${h}px;"></div>`;
    }).join('');
    const row = document.createElement('div');
    row.className = 'chat-msg-row sent';
    row.innerHTML = `
      <div class="voice-msg-bubble">
        <button class="vm-play-btn"><i class="fa-solid fa-play"></i></button>
        <div class="vm-waveform">${bars}</div>
        <span class="vm-duration">${fmtTime(duration)}</span>
      </div>`;
    chatArea.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;

    let aud = null, playing = false;
    const pb = row.querySelector('.vm-play-btn');
    const wb = row.querySelectorAll('.vm-wave-bar');
    pb.addEventListener('click', () => {
      if (!aud) {
        aud = new Audio(audioUrl);
        aud.onended = () => { playing = false; pb.innerHTML = '<i class="fa-solid fa-play"></i>'; wb.forEach(b => b.classList.remove('vm-played')); };
        aud.ontimeupdate = () => { const pct = aud.currentTime / (aud.duration || 1); wb.forEach((b, i) => b.classList.toggle('vm-played', i < Math.floor(pct * wb.length))); };
      }
      if (playing) { aud.pause(); playing = false; pb.innerHTML = '<i class="fa-solid fa-play"></i>'; }
      else         { aud.play();  playing = true;  pb.innerHTML = '<i class="fa-solid fa-pause"></i>'; }
    });
  }

  function showReviewBar(audioUrl, duration) {
    reviewBar = buildReviewBar(audioUrl, duration);
    body.appendChild(reviewBar);
    const ppb = reviewBar.querySelector(`#vrPlayPreview_${popupId}`);
    const rte = reviewBar.querySelector(`#vrReviewTimer_${popupId}`);
    reviewBar.querySelector(`#vrDiscard_${popupId}`).addEventListener('click', () => { restoreFooter(); chatInput.focus(); });
    reviewBar.querySelector(`#vrConfirmSend_${popupId}`).addEventListener('click', () => {
      if (previewAudio) { previewAudio.pause(); previewAudio = null; }
      restoreFooter(); appendVoiceMessage(audioUrl, duration); chatInput.focus();
    });
    ppb.addEventListener('click', () => {
      if (!previewAudio) {
        previewAudio = new Audio(audioUrl);
        previewAudio.onended = () => { previewPlaying = false; ppb.innerHTML = '<i class="fa-solid fa-play"></i>'; rte.textContent = fmtTime(duration); };
        previewAudio.ontimeupdate = () => { rte.textContent = fmtTime(Math.floor(previewAudio.currentTime)); };
      }
      if (previewPlaying) { previewAudio.pause(); previewPlaying = false; ppb.innerHTML = '<i class="fa-solid fa-play"></i>'; }
      else                { previewAudio.play();  previewPlaying = true;  ppb.innerHTML = '<i class="fa-solid fa-pause"></i>'; }
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks  = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        const dur  = recSeconds;
        clearInterval(recTimerID); recTimerID = null;
        micBtn?.classList.remove('is-recording');
        recBar?.remove(); recBar = null;
        showReviewBar(url, dur);
      };
      mediaRecorder.start();
      micBtn?.classList.add('is-recording');
      chatFooter.style.display = 'none';
      recBar = buildRecordingBar();
      body.appendChild(recBar);
      recSeconds = 0;
      const te = recBar.querySelector(`#vrTimer_${popupId}`);
      recTimerID = setInterval(() => { recSeconds++; te.textContent = fmtTime(recSeconds); }, 1000);

      recBar.querySelector(`#vrStop_${popupId}`).addEventListener('click', () => {
        if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
      });
      recBar.querySelector(`#vrCancel_${popupId}`).addEventListener('click', () => {
        if (mediaRecorder?.state !== 'inactive') { mediaRecorder.ondataavailable = null; mediaRecorder.onstop = null; mediaRecorder.stop(); stream.getTracks().forEach(t => t.stop()); }
        restoreFooter(); chatInput.focus();
      });
      recBar.querySelector(`#vrSendDirect_${popupId}`).addEventListener('click', () => {
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const url  = URL.createObjectURL(blob);
          const dur  = recSeconds;
          clearInterval(recTimerID); recTimerID = null;
          micBtn?.classList.remove('is-recording');
          recBar?.remove(); recBar = null;
          chatFooter.style.display = 'flex';
          appendVoiceMessage(url, dur); chatInput.focus();
        };
        if (mediaRecorder?.state !== 'inactive') mediaRecorder.stop();
      });
    } catch (err) {
      alert('Microphone access is required to send voice messages.');
    }
  }

  micBtn?.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') return;
    startRecording();
  });

  // Send text message
  function sendChatMsg() {
    const text = chatInput.value.trim();
    if (!text) return;
    const row = document.createElement('div');
    row.className = 'chat-msg-row sent';
    row.innerHTML = `<div class="chat-msg-bubble">${text}</div>`;
    chatArea.appendChild(row);
    chatInput.value = '';
    chatArea.scrollTop = chatArea.scrollHeight;
  }
  chatSend.addEventListener('click', sendChatMsg);
  chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMsg(); });

  // Minimize button → push to top of stack
  popup.querySelector(`#minimizeBtn_${popupId}`)?.addEventListener('click', e => {
    e.stopPropagation();
    minimizePopup(popupId);
  });

  // Close button — permanently removes popup
  popup.querySelector(`#closeBtn_${popupId}`)?.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
    }
    forceClosePopup(popupId);
  });

  chatInput.focus();
}

// ===== Make message panel items clickable =====
document.querySelectorAll('.mp-item[data-name]').forEach(item => {
  item.style.cursor = 'pointer';
  item.addEventListener('click', e => {
    e.stopPropagation();
    openChatFromItem(item.dataset.name, item.querySelector('.mp-avatar')?.textContent.trim() || '?');
  });
});

// ===== New Message Compose Popup =====
function createComposePopup() {
  if (document.getElementById('composePopup')) {
    const existing = document.getElementById('composePopup');
    if (stackQueue.includes('composePopup')) {
      restoreFromStack('composePopup');
    } else {
      registerPopup('composePopup');
      existing.classList.add('open');
      existing.style.display = '';
      existing.querySelector('#composeToInput')?.focus();
    }
    return;
  }

  const popup = document.createElement('div');
  popup.id        = 'composePopup';
  popup.className = 'compose-popup';
  popup.style.cssText = `position:fixed;bottom:0;right:${BASE_RIGHT}px;z-index:100;`;
  popup.innerHTML = `
    <div class="compose-header" id="composeHeader">
      <span class="compose-title">New message</span>
      <div class="compose-actions">
        <button class="compose-btn" id="composeMinimize" title="Minimize">&#8722;</button>
        <button class="compose-btn" id="composeClose"    title="Close">&#10005;</button>
      </div>
    </div>
    <div class="compose-body" id="composeBody">
      <div class="compose-to-row">
        <span class="compose-to-label">To:</span>
        <input class="compose-to-input" id="composeToInput" type="text" placeholder="">
      </div>
      <div class="compose-suggestions" id="composeSuggestions"></div>
      <div class="compose-divider"></div>
      <textarea class="compose-message" id="composeMessage" placeholder="Start a message..." rows="4"></textarea>
      <div class="compose-footer">
        <div class="compose-tools">
          <button class="compose-tool-btn" title="Emoji"><i class="fa-regular fa-face-smile"></i></button>
          <button class="compose-tool-btn" title="Attach file"><i class="fa-solid fa-paperclip"></i></button>
          <button class="compose-tool-btn" title="Image"><i class="fa-regular fa-image"></i></button>
        </div>
        <button class="compose-send-btn" id="composeSend" disabled>Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Register in minimized map
  minimizedChats.set('composePopup', { name: 'New Message', initials: '', avatarColor: '#205e38', isCompose: true });

  registerPopup('composePopup');
  popup.classList.add('open');

  // Minimize button → push to top of stack
  popup.querySelector('#composeMinimize')?.addEventListener('click', e => {
    e.stopPropagation();
    minimizePopup('composePopup');
  });

  const contacts = Array.from(document.querySelectorAll('.mp-item[data-name]'))
    .map(el => ({ name: el.dataset.name, initials: el.querySelector('.mp-avatar')?.textContent.trim() || '?' }));

  const toInput = popup.querySelector('#composeToInput');
  const suggBox = popup.querySelector('#composeSuggestions');
  const msgArea = popup.querySelector('#composeMessage');
  const sendBtn = popup.querySelector('#composeSend');
  const body    = popup.querySelector('#composeBody');

  function checkSend() { sendBtn.disabled = !(toInput.value.trim() && msgArea.value.trim()); }
  function fmtTime(s)  { return Math.floor(s / 60).toString().padStart(2,'0') + ':' + (s % 60).toString().padStart(2,'0'); }

  function buildRecordingBar() {
    const bar = document.createElement('div');
    bar.className = 'voice-recording-bar'; bar.id = 'voiceRecBar';
    bar.innerHTML = `
      <button class="vr-cancel" id="vrCancel"><i class="fa-solid fa-xmark"></i></button>
      <button class="vr-stop"   id="vrStop"><span class="vr-stop-icon"></span></button>
      <div class="vr-track"><div class="vr-bars">${'<div class="vr-bar"></div>'.repeat(8)}</div><span class="vr-timer" id="vrTimer">0:00</span></div>
      <button class="vr-send"   id="vrSendDirect"><i class="fa-solid fa-paper-plane"></i></button>`;
    return bar;
  }

  function buildReviewBar(audioUrl, duration) {
    const bar = document.createElement('div');
    bar.className = 'voice-recording-bar voice-review-bar'; bar.id = 'voiceReviewBar';
    const staticBars = Array.from({ length: 14 }, () => { const h = 5 + Math.round(Math.random() * 14); return `<div class="vr-bar" style="animation:none;height:${h}px;opacity:0.6;"></div>`; }).join('');
    bar.innerHTML = `
      <button class="vr-cancel vr-discard" id="vrDiscard"><i class="fa-solid fa-trash-can"></i></button>
      <button class="vr-play-preview"      id="vrPlayPreview"><i class="fa-solid fa-play"></i></button>
      <div class="vr-track"><div class="vr-bars">${staticBars}</div><span class="vr-timer" id="vrReviewTimer">${fmtTime(duration)}</span></div>
      <button class="vr-send" id="vrConfirmSend"><i class="fa-solid fa-paper-plane"></i></button>`;
    return bar;
  }

  function showChatView(contact) {
    const toRow = popup.querySelector('.compose-to-row');
    toRow.innerHTML = `
      <span class="compose-to-label">To:</span>
      <span class="compose-to-chip">${contact.name}
        <button class="chip-remove" id="chipRemove">&#10005;</button>
      </span>`;
    suggBox.innerHTML = ''; suggBox.style.flex = 'none';

    const chatArea = document.createElement('div');
    chatArea.className = 'compose-chat-area'; chatArea.id = 'composeChatArea';
    (contactConversations[contact.name] || [{ from: 'them', text: 'Hello!' }]).forEach(msg => {
      const row = document.createElement('div');
      row.className = `chat-msg-row ${msg.from === 'me' ? 'sent' : 'received'}`;
      row.innerHTML = msg.from === 'them'
        ? `<div class="chat-msg-av">${contact.initials}</div><div class="chat-msg-bubble">${msg.text}</div>`
        : `<div class="chat-msg-bubble">${msg.text}</div>`;
      chatArea.appendChild(row);
    });

    const chatFooter = document.createElement('div');
    chatFooter.className = 'compose-chat-footer';
    chatFooter.innerHTML = `
      <button class="compose-chat-tool mic-btn" id="micBtn"><i class="fa-solid fa-microphone"></i></button>
      <button class="compose-chat-tool" title="Attach"><i class="fa-solid fa-paperclip"></i></button>
      <button class="compose-chat-tool" title="Emoji"><i class="fa-regular fa-face-smile"></i></button>
      <input  class="compose-chat-input" id="chatInput" type="text" placeholder="Aa">
      <button class="compose-chat-send"  id="chatSend"><i class="fa-solid fa-paper-plane"></i></button>`;

    msgArea.style.display = 'none';
    popup.querySelector('.compose-divider').style.display = 'none';
    popup.querySelector('.compose-footer').style.display  = 'none';
    body.appendChild(chatArea); body.appendChild(chatFooter);
    chatArea.scrollTop = chatArea.scrollHeight;

    const ci  = chatFooter.querySelector('#chatInput');
    const cs  = chatFooter.querySelector('#chatSend');
    const mb2 = chatFooter.querySelector('#micBtn');
    function sendChatMsg() {
      const text = ci.value.trim(); if (!text) return;
      const row = document.createElement('div'); row.className = 'chat-msg-row sent';
      row.innerHTML = `<div class="chat-msg-bubble">${text}</div>`;
      chatArea.appendChild(row); ci.value = ''; chatArea.scrollTop = chatArea.scrollHeight;
    }
    cs.addEventListener('click', sendChatMsg);
    ci.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMsg(); });
    ci.focus();

    let mr2 = null, ac2 = [], rt2 = null, rs2 = 0, rb2 = null, rvb2 = null, pa2 = null, pp2 = false;
    function restoreFooter2() { clearInterval(rt2); rt2 = null; rs2 = 0; mb2?.classList.remove('is-recording'); rb2?.remove(); rb2 = null; rvb2?.remove(); rvb2 = null; if (pa2) { pa2.pause(); pa2 = null; pp2 = false; } chatFooter.style.display = 'flex'; }
    function appendVM2(url, dur) {
      const bars = Array.from({length:20},()=>`<div class="vm-wave-bar" style="height:${4+Math.round(Math.random()*16)}px;"></div>`).join('');
      const row = document.createElement('div'); row.className = 'chat-msg-row sent';
      row.innerHTML = `<div class="voice-msg-bubble"><button class="vm-play-btn"><i class="fa-solid fa-play"></i></button><div class="vm-waveform">${bars}</div><span class="vm-duration">${fmtTime(dur)}</span></div>`;
      chatArea.appendChild(row); chatArea.scrollTop = chatArea.scrollHeight;
      let a=null,pl=false; const pb=row.querySelector('.vm-play-btn'),wb=row.querySelectorAll('.vm-wave-bar');
      pb.addEventListener('click',()=>{ if(!a){a=new Audio(url);a.onended=()=>{pl=false;pb.innerHTML='<i class="fa-solid fa-play"></i>';wb.forEach(b=>b.classList.remove('vm-played'));};a.ontimeupdate=()=>{const p=a.currentTime/(a.duration||1);wb.forEach((b,i)=>b.classList.toggle('vm-played',i<Math.floor(p*wb.length)));};} if(pl){a.pause();pl=false;pb.innerHTML='<i class="fa-solid fa-play"></i>';}else{a.play();pl=true;pb.innerHTML='<i class="fa-solid fa-pause"></i>';}});
    }
    function showRVB2(url, dur) {
      rvb2 = buildReviewBar(url, dur); body.appendChild(rvb2);
      const ppb=rvb2.querySelector('#vrPlayPreview'),rte=rvb2.querySelector('#vrReviewTimer');
      rvb2.querySelector('#vrDiscard').addEventListener('click',()=>{restoreFooter2();ci.focus();});
      rvb2.querySelector('#vrConfirmSend').addEventListener('click',()=>{if(pa2){pa2.pause();pa2=null;}restoreFooter2();appendVM2(url,dur);ci.focus();});
      ppb.addEventListener('click',()=>{ if(!pa2){pa2=new Audio(url);pa2.onended=()=>{pp2=false;ppb.innerHTML='<i class="fa-solid fa-play"></i>';rte.textContent=fmtTime(dur);};pa2.ontimeupdate=()=>{rte.textContent=fmtTime(Math.floor(pa2.currentTime));};} if(pp2){pa2.pause();pp2=false;ppb.innerHTML='<i class="fa-solid fa-play"></i>';}else{pa2.play();pp2=true;ppb.innerHTML='<i class="fa-solid fa-pause"></i>';}});
    }
    async function startRec2() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({audio:true}); ac2=[];
        mr2 = new MediaRecorder(stream);
        mr2.ondataavailable = e=>{if(e.data.size>0)ac2.push(e.data);};
        mr2.onstop = ()=>{ stream.getTracks().forEach(t=>t.stop()); const blob=new Blob(ac2,{type:'audio/webm'}),url=URL.createObjectURL(blob),dur=rs2; clearInterval(rt2);rt2=null;mb2?.classList.remove('is-recording');rb2?.remove();rb2=null;showRVB2(url,dur); };
        mr2.start(); mb2?.classList.add('is-recording'); chatFooter.style.display='none'; rb2=buildRecordingBar(); body.appendChild(rb2); rs2=0;
        const te=rb2.querySelector('#vrTimer'); rt2=setInterval(()=>{rs2++;te.textContent=fmtTime(rs2);},1000);
        rb2.querySelector('#vrStop').addEventListener('click',()=>{if(mr2?.state!=='inactive')mr2.stop();});
        rb2.querySelector('#vrCancel').addEventListener('click',()=>{if(mr2?.state!=='inactive'){mr2.ondataavailable=null;mr2.onstop=null;mr2.stop();stream.getTracks().forEach(t=>t.stop());}restoreFooter2();ci.focus();});
        rb2.querySelector('#vrSendDirect').addEventListener('click',()=>{ mr2.onstop=()=>{ stream.getTracks().forEach(t=>t.stop());const blob=new Blob(ac2,{type:'audio/webm'}),url=URL.createObjectURL(blob),dur=rs2;clearInterval(rt2);rt2=null;mb2?.classList.remove('is-recording');rb2?.remove();rb2=null;chatFooter.style.display='flex';appendVM2(url,dur);ci.focus();}; if(mr2?.state!=='inactive')mr2.stop();});
      } catch(e){ alert('Microphone access is required to send voice messages.'); }
    }
    mb2?.addEventListener('click',()=>{ if(mr2?.state==='recording')return; startRec2(); });

    popup.querySelector('#chipRemove').addEventListener('click', () => {
      if(mr2?.state!=='inactive'){mr2.ondataavailable=null;mr2.onstop=null;mr2.stop();}
      restoreFooter2(); chatArea.remove(); chatFooter.remove(); suggBox.style.flex='1';
      toRow.innerHTML = `<span class="compose-to-label">To:</span><input class="compose-to-input" id="composeToInput" type="text" placeholder="">`;
      const ni = toRow.querySelector('#composeToInput');
      msgArea.style.display='none'; popup.querySelector('.compose-divider').style.display='none'; popup.querySelector('.compose-footer').style.display='none';
      ni.addEventListener('focus', () => showSuggestions(ni, ''));
      ni.addEventListener('input', () => showSuggestions(ni, ni.value.toLowerCase().trim()));
      ni.focus();
    });
  }

  function showSuggestions(inputEl, q) {
    suggBox.innerHTML = '';
    msgArea.style.display = 'none';
    popup.querySelector('.compose-divider').style.display = 'none';
    popup.querySelector('.compose-footer').style.display  = 'none';
    (q ? contacts.filter(c => c.name.toLowerCase().includes(q)) : contacts).forEach(c => {
      const item = document.createElement('div');
      item.className = 'compose-sug-item';
      item.innerHTML = `<div class="compose-sug-av">${c.initials}</div><span>${c.name}</span>`;
      item.addEventListener('click', () => { suggBox.innerHTML = ''; showChatView(c); });
      suggBox.appendChild(item);
    });
  }

  toInput.addEventListener('focus', () => showSuggestions(toInput, ''));
  toInput.addEventListener('input', () => showSuggestions(toInput, toInput.value.toLowerCase().trim()));
  msgArea.addEventListener('input', checkSend);

  popup.querySelector('#composeClose').addEventListener('click', () => {
    forceClosePopup('composePopup');
  });
  sendBtn.addEventListener('click', () => {
    forceClosePopup('composePopup');
  });

  setTimeout(() => toInput.focus(), 50);
}

const newMsgBtn = document.getElementById('newMsgBtn');
if (newMsgBtn) {
  newMsgBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('msgPanel')?.classList.remove('open');
    createComposePopup();
  });
}

if (viewAllBtn && msgPanel) {
  viewAllBtn.addEventListener('click', e => {
    e.stopPropagation();
    isExpanded = !isExpanded;
    msgPanel.classList.toggle('expanded', isExpanded);
    viewAllBtn.textContent = isExpanded ? '← Collapse messages' : 'View all messages →';
  });
}

// ===== Move panels to body to escape header stacking context =====
const msgPanelEl = document.getElementById('msgPanel');
if (msgPanelEl) {
  document.body.appendChild(msgPanelEl);
  msgPanelEl.style.position = 'fixed';
  msgPanelEl.style.top = '70px';
  msgPanelEl.style.right = '60px';
  msgPanelEl.style.zIndex = '9999';
  msgPanelEl.addEventListener('click', e => e.stopPropagation());
}

const profilePanelEl = document.getElementById('profilePanel');
if (profilePanelEl) {
  document.body.appendChild(profilePanelEl);
  profilePanelEl.style.position = 'fixed';
  profilePanelEl.style.top = '70px';
  profilePanelEl.style.right = '10px';
  profilePanelEl.style.zIndex = '9999';
  profilePanelEl.addEventListener('click', e => e.stopPropagation());
}

// ===== Admin Logout =====
function adminLogout() {
  localStorage.removeItem("smartlab_admin_token");
  localStorage.removeItem("smartlab_admin_user");
  window.location.href = "Login-Register.html";
}
// ===== Notification Bell =====
(function initNotifPanel() {
  const bellWrap   = document.getElementById('bellToggle');
  const notifPanel = document.getElementById('notifPanel');
  const notifBadge = document.getElementById('bellBadge');
  if (!bellWrap || !notifPanel) return;

  let unreadCount = notifPanel.querySelectorAll('.notif-item.unread').length;
  if (notifBadge) {
    notifBadge.textContent = unreadCount;
    notifBadge.style.display = unreadCount === 0 ? 'none' : 'flex';
  }

  bellWrap.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = notifPanel.classList.toggle('open');
    document.getElementById('msgPanel')?.classList.remove('open');
    document.getElementById('profilePanel')?.classList.remove('open');
  });

  notifPanel.addEventListener('click', e => e.stopPropagation());

  document.addEventListener('click', () => notifPanel.classList.remove('open'));

  // Mark all as read
  document.getElementById('notifMarkAll')?.addEventListener('click', () => {
    notifPanel.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
    unreadCount = 0;
    if (notifBadge) notifBadge.style.display = 'none';
  });

  // Mark individual as read on click
  notifPanel.querySelectorAll('.notif-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation();
      if (item.classList.contains('unread')) {
        item.classList.remove('unread');
        unreadCount = Math.max(0, unreadCount - 1);
        if (notifBadge) {
          notifBadge.textContent = unreadCount;
          notifBadge.style.display = unreadCount === 0 ? 'none' : 'flex';
        }
      }
    });
  });

  // Move panel to fixed position (same as msgPanel / profilePanel)
  document.body.appendChild(notifPanel);
  notifPanel.style.position = 'fixed';
  notifPanel.style.top      = '70px';
  notifPanel.style.right    = '110px';
  notifPanel.style.zIndex   = '9999';
  notifPanel.addEventListener('click', e => e.stopPropagation());
})();