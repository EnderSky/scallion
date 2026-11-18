'use strict';

const socket = io();

// --- State & Selectors ---
let myId = null;
let myRoomCode = null;
let myNickname = '';
let selectedCategory = 'All';
let currentFuseEndsAt = null;
let currentFuseDuration = null;
let intermissionInterval = null;

const ERROR_MAP = {
  'need_two_players': 'Need at least 2 players to start!',
  'room_not_found': 'Room not found. Check the code.',
  'game_already_started': 'Game already in progress.',
  'not_host': 'Only the host can do that!',
  'no_question_data': 'No questions available for this category.',
  'player_not_found': 'You are no longer in this room.',
  'eliminated': 'You have been eliminated!',
  'not_your_turn': 'Wait for your turn!',
};

const views = {
  lobby: document.getElementById('view-lobby'),
  waiting: document.getElementById('view-waiting'),
  game: document.getElementById('view-game'),
};

const elements = {
  nickname: document.getElementById('lobby-nickname'),
  categoryPills: document.getElementById('category-pills'),
  roomCode: document.getElementById('lobby-room-code'),
  waitingCode: document.getElementById('waiting-code'),
  waitingCategory: document.getElementById('waiting-category'),
  waitingPlayers: document.getElementById('waiting-players'),
  btnStart: document.getElementById('btn-start'),
  promptBanner: document.getElementById('prompt-banner'),
  timerBarFill: document.getElementById('timer-bar-fill'),
  turnIndicator: document.getElementById('turn-indicator'),
  playerRing: document.getElementById('player-ring'),
  answerForm: document.getElementById('answer-form'),
  answerInput: document.getElementById('answer-input'),
  activityFeed: document.getElementById('activity-feed'),
  toastContainer: document.getElementById('toast-container'),
  globalToastContainer: document.getElementById('global-toast-container'),
  recentAnswers: document.getElementById('recent-answers'),
  centerScallion: document.getElementById('center-scallion'),
  centerPlayerName: document.getElementById('center-player-name'),
  centerCleaver: document.getElementById('center-cleaver'),
  intermissionBanner: document.getElementById('intermission-banner'),
  intermissionText: document.getElementById('intermission-text'),
};

// --- Helpers ---

function showView(viewName) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[viewName].classList.remove('hidden');
}

function showToast(message, type = 'info') {
  const isGameVisible = !views.game.classList.contains('hidden');
  const container = isGameVisible ? elements.toastContainer : elements.globalToastContainer;
  
  let originalText = '';
  if (isGameVisible) {
    originalText = elements.turnIndicator.textContent;
    elements.turnIndicator.classList.add('hidden');
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const colors = {
    error: { border: 'var(--error)', text: '#2b1d12' },
    success: { border: 'var(--accent-green)', text: '#2b1d12' },
    warning: { border: 'var(--accent-gold)', text: '#2b1d12' },
    info: { border: 'var(--accent-green)', text: '#2b1d12' },
  };
  const theme = colors[type] || colors.info;
  toast.style.borderColor = theme.border;
  toast.style.color = theme.text;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.remove();
      if (isGameVisible) {
        elements.turnIndicator.classList.remove('hidden');
        elements.turnIndicator.textContent = originalText;
      }
    }, 300);
  }, 2000);
}

function getScallionAvatarSVG(state) {
  const base = `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M40,90 Q50,95 60,90 Q65,70 60,50 L60,20 Q60,10 50,10 Q40,10 40,20 L40,50 Q35,70 40,90" fill="#fdfdfd" stroke="#160d08" stroke-width="3"/>`;
  
  let face = '';
  if (state === 'panic') {
    face = `
      <circle cx="42" cy="35" r="4" fill="white" stroke="#160d08" stroke-width="1"/>
      <circle cx="42" cy="35" r="1" fill="black"/>
      <circle cx="58" cy="35" r="4" fill="white" stroke="#160d08" stroke-width="1"/>
      <circle cx="58" cy="35" r="1" fill="black"/>
      <circle cx="50" cy="45" r="3" fill="none" stroke="#160d08" stroke-width="2"/>
      <text x="62" y="30" font-size="15">💧</text>
    `;
  } else if (state === 'chopped') {
    face = `
      <text x="38" y="38" font-size="10" font-weight="bold">X</text>
      <text x="54" y="38" font-size="10" font-weight="bold">X</text>
      <line x1="45" y1="45" x2="55" y2="45" stroke="#160d08" stroke-width="2"/>
    `;
  } else {
    face = `
      <circle cx="42" cy="35" r="2" fill="#160d08"/>
      <circle cx="58" cy="35" r="2" fill="#160d08"/>
      <path d="M45,42 Q50,45 55,42" fill="none" stroke="#160d08" stroke-width="2" stroke-linecap="round"/>
    `;
  }
  
  return base + face + `</svg>`;
}

function addFeedMessage(msg) {
  const div = document.createElement('div');
  div.className = 'feed-item';
  div.textContent = msg;
  elements.activityFeed.prepend(div);
  if (elements.activityFeed.childNodes.length > 10) {
    elements.activityFeed.removeChild(elements.activityFeed.lastChild);
  }
}

function createWinnerOverlay(room) {
  const winner = room.winner ? (room.winner.nickname || room.winner.name) : 'No one';
  const overlay = document.createElement('div');
  overlay.id = 'winner-overlay';
  overlay.className = 'winner-backdrop';
  
  const isHost = room.players.find(p => p.id === socket.id)?.isHost;

  overlay.innerHTML = `
    <div class="winner-card">
      <h1>WINNER!</h1>
      <h2>${winner}</h2>
      <div class="winner-actions">
        ${isHost ? `<button id="play-again-btn">Play Again</button>` : `<span style="color:var(--text-dim)">Waiting for host...</span>`}
        <button id="btn-back-lobby">Back to Lobby</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  if (isHost) {
    document.getElementById('play-again-btn').onclick = () => {
      socket.emit('play_again', { roomCode: room.code });
      overlay.remove();
    };
  }
  document.getElementById('btn-back-lobby').onclick = () => {
    overlay.remove();
    location.reload(); 
  };
}

// --- Socket Events ---

socket.on('connect', () => {
  myId = socket.id;
});

socket.on('disconnect', () => {
  showToast('Connection lost! Reconnecting...', 'warning');
});

socket.on('categories_list', (list) => {
  elements.categoryPills.innerHTML = '';
  const categories = ['All', ...list];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `category-pill ${cat === 'All' ? 'active' : ''}`;
    btn.textContent = cat === 'All' ? 'All Categories' : cat;
    btn.onclick = () => {
      selectedCategory = cat;
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    };
    elements.categoryPills.appendChild(btn);
  });
});

socket.on('room_updated', (room) => {
  if (document.getElementById('winner-overlay')) return;
  myRoomCode = room.code;
  if (room.state === 'playing' || room.state === 'intermission' || room.state === 'starting') {
    socket.emit('request_game_state', { roomCode: room.code });
    return;
  }
  elements.waitingCode.textContent = room.code;
  elements.waitingCategory.textContent = room.category;
  elements.waitingPlayers.innerHTML = '';
  room.players.forEach(p => {
    const li = document.createElement('li');
    li.textContent = `${p.nickname} ${p.isHost ? '(Host)' : ''}`;
    elements.waitingPlayers.appendChild(li);
  });
  const me = room.players.find(p => p.id === socket.id);
  elements.btnStart.classList.toggle('hidden', !me || !me.isHost);
  showView('waiting');
});

socket.on('game_starting', (data) => {
  showView('game');
  elements.answerInput.disabled = true;
  elements.intermissionBanner.classList.remove('hidden');
  
  let count = data.seconds;
  elements.intermissionText.textContent = `🔪 Get ready! ${data.firstPlayer} is up first in ${count}...`;
  
  if (intermissionInterval) clearInterval(intermissionInterval);
  intermissionInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(intermissionInterval);
      intermissionInterval = null;
    } else {
      elements.intermissionText.textContent = `🔪 Get ready! ${data.firstPlayer} is up first in ${count}...`;
    }
  }, 1000);
});

socket.on('game_state', (room) => {
  const overlay = document.getElementById('winner-overlay');
  if (overlay) overlay.remove();

  showView('game');
  currentFuseEndsAt = room.fuseEndsAt;
  currentFuseDuration = room.fuseDurationMs;

  if (intermissionInterval) {
    clearInterval(intermissionInterval);
    intermissionInterval = null;
  }
  elements.intermissionBanner.classList.add('hidden');
  elements.answerInput.disabled = (room.state !== 'playing');

  if (room.currentPrompt) {
    const cat = room.currentPrompt.category || (room.category === 'All' ? 'Random' : room.category);
    elements.promptBanner.innerHTML = `<span style="color:var(--accent-green); font-size:0.8rem; display:block; text-transform:uppercase;">${cat}</span>${room.currentPrompt.prompt}`;
  }

  if (room.activePlayerId) {
    const activeP = room.players.find(p => p.id === room.activePlayerId);
    if (activeP) {
      elements.centerScallion.innerHTML = getScallionAvatarSVG('panic');
      elements.centerPlayerName.textContent = activeP.nickname;
    }
  }

  document.querySelectorAll('.typing-bubble').forEach(b => b.remove());

  elements.playerRing.innerHTML = '';
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3;

  room.players.forEach((p, i) => {
    const angle = (i / room.players.length) * Math.PI * 2;
    const x = centerX + radius * Math.cos(angle) - 55;
    const y = centerY + radius * Math.sin(angle) - 25;
    const card = document.createElement('div');
    card.className = `player-card ${p.id === room.activePlayerId ? 'active' : ''} ${!p.alive ? 'eliminated' : ''}`;
    card.id = `player-${p.id}`;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    const rarityPercent = (p.rarityPoints / 100) * 100;
    const avatarState = !p.alive ? 'chopped' : (p.id === room.activePlayerId ? 'panic' : 'calm');
    let livesHtml = '';
    for(let h=0; h<3; h++) {
      const filled = h < p.hearts;
      livesHtml += `<div class="stalk" style="background:${filled ? 'var(--accent-green)' : 'transparent'}; border-style:${filled ? 'solid' : 'dashed'}"></div>`;
    }
    card.innerHTML = `
      <div class="scallion-avatar">${getScallionAvatarSVG(avatarState)}</div>
      <div class="player-name">${p.nickname}</div>
      <div class="player-stats">
        <div class="scallion-lives">${livesHtml}</div>
        <div class="rarity-bar-bg"><div class="rarity-bar-fill" style="width:${rarityPercent}%"></div></div>
      </div>
    `;
    elements.playerRing.appendChild(card);
  });

  const isMyTurn = room.activePlayerId === socket.id;
  if (isMyTurn) {
    elements.turnIndicator.textContent = "YOUR TURN! ANSWER QUICKLY!";
    if (room.state === 'playing') {
        elements.answerInput.disabled = false;
        elements.answerInput.focus();
    }
    document.body.classList.add('active-turn');
  } else {
    elements.turnIndicator.textContent = "Wait your turn...";
    elements.answerInput.disabled = true;
    document.body.classList.remove('active-turn');
  }
});

socket.on('answer_result', (res) => {
  if (res.valid) {
    const rarityText = res.rarity.replace('_', ' ').toUpperCase();
    addFeedMessage(`Correct! ${res.rarity} (+${res.pointsAwarded} pts)`);
    showToast(`${rarityText}! +${res.pointsAwarded}`, 'success');
    const pill = document.createElement('span');
    pill.className = `answer-pill pill-${res.rarity}`;
    pill.textContent = res.matchedAnswer;
    elements.recentAnswers.prepend(pill);
    if (elements.recentAnswers.childNodes.length > 12) {
      elements.recentAnswers.removeChild(elements.recentAnswers.lastChild);
    }
  } else {
    const msg = res.reason === 'used' ? 'That answer was already used!' : 'Invalid answer!';
    addFeedMessage(msg);
    showToast(msg, 'error');
    elements.answerForm.classList.add('shake');
    setTimeout(() => elements.answerForm.classList.remove('shake'), 400);
  }
});

socket.on('puffer_exploded', (data) => {
  addFeedMessage(`💥 ${data.playerName} lost a heart!`);
  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
});

socket.on('round_intermission', (data) => {
  elements.answerInput.disabled = true;
  elements.recentAnswers.innerHTML = '';
  elements.intermissionBanner.classList.remove('hidden');
  elements.centerCleaver.classList.add('cleaver-chop');
  setTimeout(() => elements.centerCleaver.classList.remove('cleaver-chop'), 300);

  let count = 3;
  elements.intermissionText.textContent = `🔪 ${data.explodedPlayer} got chopped! ${data.nextPlayer} is up next in ${count}...`;
  
  if (intermissionInterval) clearInterval(intermissionInterval);
  intermissionInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(intermissionInterval);
      intermissionInterval = null;
    } else {
      elements.intermissionText.textContent = `🔪 ${data.explodedPlayer} got chopped! ${data.nextPlayer} is up next in ${count}...`;
    }
  }, 1000);
});

socket.on('game_over', (data) => {
  createWinnerOverlay(data);
});

socket.on('error_msg', (code) => {
  const msg = ERROR_MAP[code] || code;
  showToast(msg, 'error');
});

socket.on('player_typing', ({ playerId, text }) => {
  const card = document.getElementById(`player-${playerId}`);
  if (!card) return;
  let bubble = card.querySelector('.typing-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'typing-bubble';
    card.appendChild(bubble);
  }
  bubble.textContent = text ? 'Typing...' : '';
  if (!text) setTimeout(() => bubble.remove(), 1000);
});

// --- UI Interactions ---

document.getElementById('btn-create').onclick = () => {
  const nickname = elements.nickname.value.trim();
  if (!nickname) return showToast('Please enter a nickname', 'error');
  socket.emit('create_room', { nickname, category: selectedCategory });
};

document.getElementById('btn-join').onclick = () => {
  const nickname = elements.nickname.value.trim();
  const roomCode = elements.roomCode.value.trim().toUpperCase();
  if (!nickname) return showToast('Please enter a nickname', 'error');
  if (!roomCode) return showToast('Please enter a room code', 'error');
  socket.emit('join_room', { roomCode, nickname });
};

elements.btnStart.onclick = () => {
  socket.emit('start_game', { roomCode: myRoomCode });
};

elements.answerForm.onsubmit = (e) => {
  e.preventDefault();
  const text = elements.answerInput.value.trim();
  if (!text) return;
  socket.emit('submit_answer', { roomCode: myRoomCode, text });
  elements.answerInput.value = '';
};

elements.waitingCode.onclick = async () => {
  const code = elements.waitingCode.textContent;
  if (code === '----') return;
  try {
    await navigator.clipboard.writeText(code);
    showToast('Room code copied!', 'info');
  } catch (err) {
    showToast('Failed to copy code', 'error');
  }
};

let typingTimeout;
elements.answerInput.oninput = (e) => {
  const text = e.target.value;
  if (!myRoomCode) return;
  if (typingTimeout) return;
  typingTimeout = setTimeout(() => {
    socket.emit('typing_update', { roomCode: myRoomCode, text });
    typingTimeout = null;
  }, 80);
};

function updateFuseUI() {
  if (currentFuseEndsAt && currentFuseDuration) {
    const remaining = Math.max(0, currentFuseEndsAt - Date.now());
    const percent = (remaining / currentFuseDuration) * 100;
    if (elements.timerBarFill) {
      elements.timerBarFill.style.width = `${percent}%`;
      if (percent < 30) {
        const activeId = document.querySelector('.player-card.active')?.id.replace('player-','');
        if (activeId) {
          const activeCard = document.getElementById(`player-${activeId}`);
          if (activeCard) activeCard.classList.add('panic-shake');
        }
        if (elements.centerCleaver) elements.centerCleaver.classList.add('cleaver-panic');
      } else {
        document.querySelectorAll('.panic-shake').forEach(el => el.classList.remove('panic-shake'));
        if (elements.centerCleaver) elements.centerCleaver.classList.remove('cleaver-panic');
      }
    }
  } else if (currentFuseEndsAt) {
    if (elements.timerBarFill) elements.timerBarFill.style.width = `100%`;
  }
}
setInterval(updateFuseUI, 50);

socket.emit('get_categories');

const style = document.createElement('style');
style.textContent = `
  @keyframes pop {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }
  @keyframes flash {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }
  .shake { animation: shake-input 0.3s; }
  @keyframes shake-input {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
    100% { transform: translateX(0); }
  }
`;
document.head.appendChild(style);
