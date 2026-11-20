'use strict';

const socket = io();

// --- State & Selectors ---
let myId = null;
let currentRoomCode = null;
let myNickname = '';
let selectedCategory = 'All';
let currentFuseEndsAt = null;
let currentFuseDuration = null;
let currentActivePlayerId = null;
let intermissionInterval = null;
let statusFlashTimer = null;
let statusFlashActive = false;
let isMyTurn = false;
let previousPlayerIds = new Set();
let lastWinnerId = null;
let lastWinnerName = null;
let lastPromptId = null;
let roomPhase = 'lobby';
let returnCountdownInterval = null;
let isPostGameShowcase = false;
let justLeftRoomCode = null; // debounce: ignore stale room_updated for room we just left

const ERROR_MAP = {
  'need_two_players': 'Need at least 2 players to start!',
  'room_not_found': 'Room not found. Check the code.',
  'game_already_started': 'Game already in progress.',
  'not_host': 'Only the host can do that!',
  'no_question_data': 'No questions available for this category.',
  'player_not_found': 'You are no longer in this room.',
  'eliminated': 'You have been eliminated!',
  'not_your_turn': 'Wait for your turn!',
  'room_full': 'Room is full (max 6 players).',
};

const SLOT_MAP = {
  1: ['slot-top'],
  2: ['slot-top-left', 'slot-top-right'],
  3: ['slot-mid-left', 'slot-top', 'slot-mid-right'],
  4: ['slot-mid-left', 'slot-top-left', 'slot-top-right', 'slot-mid-right'],
  5: ['slot-mid-left', 'slot-top-left', 'slot-top', 'slot-top-right', 'slot-mid-right'],
};

function getOpponentsInTurnOrder(room) {
  const players = room.players;
  const localIndex = players.findIndex(p => p.id === socket.id);
  if (localIndex === -1) return players.filter(p => p.id !== socket.id);
  const ordered = [];
  for (let i = 1; i < players.length; i++) {
    ordered.push(players[(localIndex + i) % players.length]);
  }
  return ordered;
}

// Human display slot order (left-to-right, top-to-bottom)
// Local player (YOU) always renders at slot-local (bottom center)
const HUMAN_SLOT_ORDER = ['slot-top-left', 'slot-top', 'slot-top-right', 'slot-mid-left', 'slot-mid-right'];

function renderArenaPlayers(containerEl, players, options = {}) {
  const { activePlayerId = null, isLocal = true, isWaitingRoom = false, isHost = false, isLobby = false, isHostViewer = false, localPlayer: passedLocalPlayer = null } = options;

  // Remove any previously rendered player cards from the container
  containerEl.querySelectorAll('.player-card').forEach(c => c.remove());

  // Determine local player
  const localPlayer = passedLocalPlayer || players.find(p => p.id === socket.id);
  
  if (!localPlayer && !isWaitingRoom && !isLobby) {
    console.warn('[renderArenaPlayers] Local player not found in players array during gameplay!', { socketId: socket.id, players: players.map(p => ({ id: p.id, slotClass: p.slotClass })) });
  }

  // Separate humans and bots
  // Players array is in join order (host first, then join order)
  const humans = players.filter(p => !p.isBot);
  const bots = players.filter(p => p.isBot);

  // Compute human display slots by skipping self AND bot-occupied slots
  // Each client sees other humans in HUMAN_SLOT_ORDER, skipping themselves
  // and skipping any slots occupied by bots
  const humanDisplaySlots = new Map(); // playerId -> slotClass
  const botOccupiedSlots = new Set(bots.map(b => b.slotClass).filter(Boolean));
  
  if (localPlayer) {
    const otherHumans = humans.filter(p => p.id !== localPlayer.id);
    let slotIndex = 0;
    otherHumans.forEach((human) => {
      // Find next available slot not occupied by a bot
      while (slotIndex < HUMAN_SLOT_ORDER.length && botOccupiedSlots.has(HUMAN_SLOT_ORDER[slotIndex])) {
        slotIndex++;
      }
      if (slotIndex < HUMAN_SLOT_ORDER.length) {
        humanDisplaySlots.set(human.id, HUMAN_SLOT_ORDER[slotIndex]);
        slotIndex++;
      }
    });
  }

  // Bots keep their explicitly assigned slotClass
  const botDisplaySlots = new Map();
  bots.forEach(bot => {
    if (bot.slotClass) {
      botDisplaySlots.set(bot.id, bot.slotClass);
    }
  });

  // Build combined slot map for rendering
  const slotMap = new Map();
  humanDisplaySlots.forEach((slot, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) slotMap.set(slot, player);
  });
  botDisplaySlots.forEach((slot, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) slotMap.set(slot, player);
  });

  // Slot priority order for rendering
  const allSlots = ['slot-local', 'slot-top', 'slot-top-left', 'slot-top-right', 'slot-mid-left', 'slot-mid-right'];

  allSlots.forEach(slotClass => {
    let card;

    if (slotClass === 'slot-local') {
      // slot-local: local player always renders here (bottom center)
      if (localPlayer) {
        card = createPlayerCard(localPlayer, activePlayerId, true, { showBotDifficulty: isWaitingRoom, isLobby, isHostViewer });
        if (localPlayer.isBot) card.classList.add('is-bot');
        if (localPlayer.isHost) card.classList.add('is-host');
      }
    } else {
      const player = slotMap.get(slotClass);
      if (player) {
        // Player in their computed display slot
        const isLocalPlayer = player.id === socket.id;
        card = createPlayerCard(player, activePlayerId, isLocalPlayer, { showBotDifficulty: isWaitingRoom, isLobby, isHostViewer });
        if (player.isBot) card.classList.add('is-bot');
        if (player.isHost) card.classList.add('is-host');
      } else if (isWaitingRoom && isHost && isLobby && slotClass !== 'slot-local') {
        // Empty slot placeholder (only for host in waiting room/lobby)
        // Check if this slot is actually empty (no human assigned, no bot assigned)
        const hasHuman = humanDisplaySlots.has(slotClass);
        const hasBot = botOccupiedSlots.has(slotClass);
        if (!hasHuman && !hasBot) {
          card = createPlaceholderCard(slotClass);
        }
      } else {
        // No player and not a placeholder slot - skip
        return;
      }
    }

    if (card) {
      card.classList.add(slotClass);
      containerEl.appendChild(card);
    }
  });
}

// Render neutral game start view (all players in position, no active player highlight, no cleaver)
function renderGameStartView(data, localPlayer) {
  const stage = document.getElementById('game-arena-stage');
  if (!stage) return;
  
  // Clear existing cards
  stage.querySelectorAll('.player-card').forEach(c => c.remove());
  
  // Clear center cleaver
  const cleaver = document.getElementById('center-cleaver');
  if (cleaver) cleaver.style.display = 'none';
  
  // Reset chopping board to neutral state
  const choppingBlock = stage.querySelector('.chopping-block');
  if (choppingBlock) {
    choppingBlock.classList.remove('active-turn');
    choppingBlock.style.borderColor = 'var(--border-dark)';
    choppingBlock.style.boxShadow = '0 8px 0 #160d08';
  }
  
  // Reset center scallion to calm state
  const centerScallion = document.getElementById('center-scallion');
  if (centerScallion) {
    centerScallion.innerHTML = getScallionAvatarSVG('calm');
  }
  const centerPlayerName = document.getElementById('center-player-name');
  if (centerPlayerName) centerPlayerName.textContent = '';
  
  const players = data.players || [];
  
  // Use passed localPlayer or find from players
  const me = localPlayer || players.find(p => p.id === socket.id);
  
  // During countdown, use same skip-self logic so each player sees others correctly
  // Reuse renderArenaPlayers logic but with countdown-specific options
  renderArenaPlayers(stage, players, {
    activePlayerId: null,
    isLocal: true,
    isWaitingRoom: false,
    isHost: me?.isHost || false,
    isLobby: false,
    isHostViewer: me?.isHost || false,
    localPlayer: me,
  });

  // Show intermission banner with countdown
  elements.intermissionBanner.classList.remove('hidden');
  elements.intermissionText.textContent = `🔪 Get ready! ${data.firstPlayer} is up first in ${data.seconds}...`;
}

const views = {
  lobby: document.getElementById('view-lobby'),
  waiting: document.getElementById('waiting-screen'),
  game: document.getElementById('view-game'),
};

const elements = {
  nickname: document.getElementById('lobby-nickname'),
  categoryPills: document.getElementById('category-pills'),
  roomCode: document.getElementById('lobby-room-code'),
  waitingCode: document.getElementById('waiting-code'),
  waitingCategory: document.getElementById('waiting-category'),
  btnStart: document.getElementById('btn-start'),
  btnLeaveRoom: document.getElementById('btn-leave-room'),
  waitingArenaStage: document.getElementById('waiting-arena-stage'),
  waitingWinnerBanner: document.getElementById('waiting-winner-banner'),
  waitingStatusEl: document.getElementById('waiting-host-message'),
  promptBanner: document.getElementById('prompt-banner'),
  timerBarFill: document.getElementById('timer-bar-fill'),
  turnIndicator: document.getElementById('turn-indicator'),
  playersContainer: document.getElementById('player-ring'), 
  localPlayerSlot: document.getElementById('local-player-slot'),
  answerForm: document.getElementById('answer-form'),
  answerInput: document.getElementById('answer-input'),
  sendBtn: document.getElementById('send-btn'),
  activityFeed: document.getElementById('activity-feed'),
  eventLog: document.getElementById('event-log'),
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
  console.log('[showView] switching to', viewName);
  Object.values(views).forEach(v => v?.classList.add('hidden'));
  views[viewName]?.classList.remove('hidden');
}

function showToast(message, type = 'info') {
  const isGameVisible = !views.game.classList.contains('hidden');
  if (isGameVisible) {
    flashTurnStatus(message, type);
    return;
  }
  const container = elements.globalToastContainer;
  
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
    }, 300);
  }, 2000);
}

function flashTurnStatus(message, type = 'info', durationMs = 1400) {
  if (statusFlashTimer) {
    clearTimeout(statusFlashTimer);
    statusFlashTimer = null;
  }
  statusFlashActive = true;

  elements.turnIndicator.classList.remove('status-success', 'status-error', 'status-info');

  const typeMap = {
    success: 'status-success',
    error: 'status-error',
    info: 'status-info',
    warning: 'status-info',
  };
  elements.turnIndicator.classList.add(typeMap[type] || 'status-info');
  elements.turnIndicator.textContent = message;

  statusFlashTimer = setTimeout(() => {
    statusFlashTimer = null;
    statusFlashActive = false;
    revertTurnStatus();
  }, durationMs);
}

function revertTurnStatus() {
  elements.turnIndicator.classList.remove('status-success', 'status-error', 'status-info');
  const activePlayerId = document.querySelector('.player-card.active')?.getAttribute('data-player-id');
  if (activePlayerId === socket.id) {
    elements.turnIndicator.textContent = "YOUR TURN! ANSWER QUICKLY!";
  } else {
    elements.turnIndicator.textContent = "Wait your turn...";
  }
}

function resetPostGameState() {
  lastWinnerId = null;
  lastWinnerName = null;
  roomPhase = 'lobby';
  isPostGameShowcase = false;

  if (returnCountdownInterval) {
    clearInterval(returnCountdownInterval);
    returnCountdownInterval = null;
  }

  const banner = elements.waitingWinnerBanner;
  if (banner) {
    banner.classList.add('hidden');
    banner.textContent = '';
  }

  const meta = document.getElementById('waiting-room-meta');
  if (meta) {
    meta.classList.remove('hidden');
  }

  document.querySelectorAll('.player-card').forEach(card => {
    card.classList.remove('panic-shake', 'board-shake', 'is-winner', 'is-dead');
  });

  const board = document.querySelector('.chopping-block');
  if (board) {
    board.classList.remove('board-shake');
  }

  elements.eventLog.innerHTML = '';
  elements.recentAnswers.innerHTML = '';
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

function addEventLog(text) {
  const el = document.createElement('div');
  el.className = 'event-log-item';
  el.textContent = text;
  elements.eventLog.appendChild(el);
  while (elements.eventLog.children.length > 3) {
    elements.eventLog.removeChild(elements.eventLog.firstChild);
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
  console.log('[socket] connected', myId);
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
  console.log('[room_updated] received', room?.code, room?.state, room?.players?.length);
  // Debounce: ignore stale update for room we just left
  if (justLeftRoomCode && room?.code === justLeftRoomCode) {
    console.log('[room_updated] debounce: ignoring stale update for just-left room', justLeftRoomCode);
    return;
  }
  // Membership guard: ignore updates for rooms we're no longer in (blocks leave-room bounce-back)
  if (room && Array.isArray(room.players) && !room.players.some(p => p.id === socket.id)) {
    console.log('[room_updated] guard: not a member of this room');
    return;
  }
  if (document.getElementById('winner-overlay')) return;
  if (isPostGameShowcase) return;
  if (!room?.code) {
    console.error('[room_updated] invalid room data', room);
    return;
  }

  currentRoomCode = room.code;
  console.log('[room_updated] set currentRoomCode =', currentRoomCode);
  if (returnCountdownInterval) return;
  roomPhase = room.state || room.phase || 'lobby';

  resetPostGameState();

  // Detect player joins/leaves for event log
  const currentPlayerIds = new Set((room.players || []).map(p => p.id));
  if (previousPlayerIds.size > 0) {
    const joined = room.players?.find(p => !previousPlayerIds.has(p.id));
    const left = [...previousPlayerIds].filter(id => !currentPlayerIds.has(id));
    if (joined) {
      addEventLog(`${joined.nickname} joined the room`);
    }
    if (left.length > 0) {
      const leftName = room.players?.find(p => p.id === left[0])?.nickname || 'A player';
      addEventLog(`${leftName} left the room`);
    }
  }
  previousPlayerIds = currentPlayerIds;

  if (room.state === 'playing' || room.state === 'intermission' || room.state === 'starting') {
    socket.emit('request_game_state', { roomCode: room.code });
    return;
  }

  // Waiting room: render 3x3 arena simulation
  elements.waitingCode.textContent = room.code;
  elements.waitingCategory.textContent = room.category || 'All Categories';
  const count = (room.players || []).length;
  const countEl = document.getElementById('waiting-player-count');
  if (countEl) countEl.textContent = `${count} / 6`;

  const me = room.players?.find(p => p.id === socket.id);
  elements.btnStart.classList.toggle('hidden', !me || !me.isHost);

  // Show host waiting message if not host
  const hostMsg = document.getElementById('waiting-host-message');
  if (hostMsg) hostMsg.classList.toggle('hidden', !!me && me.isHost);

  // Render players in 3x3 arena simulation
  const stage = elements.waitingArenaStage;
  if (stage) {
    const me = room.players?.find(p => p.id === socket.id);
    renderArenaPlayers(stage, room.players || [], {
      activePlayerId: null,
      isLocal: true,
      isWaitingRoom: true,
      isHost: me?.isHost || false,
      isLobby: true,
      isHostViewer: me?.isHost || false,
      localPlayer: me,
    });
  }

  console.log('[room_updated] calling showView(waiting)');
  showView('waiting');
});

socket.on('game_starting', (data) => {
  // Debounce: ignore stale update for room we just left
  if (justLeftRoomCode && data?.code === justLeftRoomCode) {
    console.log('[game_starting] debounce: ignoring stale update for just-left room', justLeftRoomCode);
    return;
  }
  // Membership guard: only process if we're in the room that's starting
  if (data && Array.isArray(data.players) && !data.players.some(p => p.id === socket.id)) return;
  showView('game');
  elements.sendBtn.disabled = true;
  isMyTurn = false;
  lastWinnerId = null;
  lastWinnerName = null;
  statusFlashActive = false;
  if (elements.waitingWinnerBanner) {
    elements.waitingWinnerBanner.classList.add('hidden');
    elements.waitingWinnerBanner.textContent = '';
  }
  // Show loading state in prompt banner during countdown
  elements.promptBanner.textContent = 'Loading prompt...';
  elements.promptBanner.classList.remove('ticket-swap');
  
  // Render neutral game start view
  const me = data.players?.find(p => p.id === socket.id);
  renderGameStartView(data, me);
  
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
  // Debounce: ignore stale update for room we just left
  if (justLeftRoomCode && room?.code === justLeftRoomCode) {
    console.log('[game_state] debounce: ignoring stale update for just-left room', justLeftRoomCode);
    return;
  }
  // Membership guard: ignore updates for rooms we're no longer in
  if (room && Array.isArray(room.players) && !room.players.some(p => p.id === socket.id)) return;

  const overlay = document.getElementById('winner-overlay');
  if (overlay) overlay.remove();

  showView('game');
  currentFuseEndsAt = room.fuseEndsAt;
  currentFuseDuration = room.fuseDurationMs;
  currentActivePlayerId = room.activePlayerId;

  if (intermissionInterval) {
    clearInterval(intermissionInterval);
    intermissionInterval = null;
  }
  elements.intermissionBanner.classList.add('hidden');
  
  // Show cleaver during gameplay (it was hidden during countdown)
  if (room.state === 'playing' && elements.centerCleaver) {
    elements.centerCleaver.style.display = '';
  }
  
  elements.sendBtn.disabled = (room.state !== 'playing');

  // Prompt Animation & Text Update
  if (room.currentPrompt) {
    const promptId = room.currentPrompt.id;
    if (promptId !== lastPromptId) {
      elements.promptBanner.classList.add('ticket-swap');
      setTimeout(() => {
        const cat = room.currentPrompt.category || (room.category === 'All' ? 'Random' : room.category);
        elements.promptBanner.innerHTML = `<span style="color:var(--accent-green); font-size:0.8rem; display:block; text-transform:uppercase;">${cat}</span>${room.currentPrompt.prompt}`;
      }, 250);
      setTimeout(() => {
        elements.promptBanner.classList.remove('ticket-swap');
      }, 500);
      lastPromptId = promptId;
    }
  }

  // Render Recent Answers from Server-Authoritative List (3 most recent, newest on top)
  elements.recentAnswers.innerHTML = '';
  if (room.usedAnswersList) {
    const last3 = room.usedAnswersList.slice(-3);
    last3.slice().reverse().forEach(item => {
      const pill = document.createElement('span');
      pill.className = `answer-pill pill-${item.rarity}`;
      pill.textContent = item.answer;
      elements.recentAnswers.appendChild(pill);
    });
  }

  if (room.activePlayerId) {
    const activeP = room.players.find(p => p.id === room.activePlayerId);
    if (activeP) {
      elements.centerScallion.innerHTML = getScallionAvatarSVG('panic');
      elements.centerPlayerName.textContent = activeP.nickname;
    }
  }

  // Clear all typing bubbles on turn change
  document.querySelectorAll('.typing-bubble').forEach(b => {
    b.textContent = '';
    b.classList.remove('visible');
  });

  // Render players into 3×3 grid slots on #game-arena-stage
  const stage = document.getElementById('game-arena-stage');
  const choppingBlock = stage?.querySelector('.chopping-block');
  if (stage) {
    // Clear legacy containers if present
    if (elements.playersContainer) {
      elements.playersContainer.innerHTML = '';
      elements.playersContainer.classList.add('hidden');
    }
    if (elements.localPlayerSlot) {
      elements.localPlayerSlot.innerHTML = '';
      elements.localPlayerSlot.classList.add('hidden');
    }
    // Remove any previously rendered player cards from stage
    stage.querySelectorAll('.player-card').forEach(c => c.remove());

    const me = room.players.find(p => p.id === socket.id);
    renderArenaPlayers(stage, room.players, {
      activePlayerId: room.activePlayerId,
      isLocal: true,
      isWaitingRoom: false,
      isHost: me?.isHost || false,
      isLobby: false,
      isHostViewer: me?.isHost || false,
      localPlayer: me,
    });
  }

  const isMyTurn = room.activePlayerId === socket.id;
  if (isMyTurn) {
    // Cancel any active status flash immediately when it becomes our turn
    if (statusFlashTimer) {
      clearTimeout(statusFlashTimer);
      statusFlashTimer = null;
    }
    statusFlashActive = false;
    elements.turnIndicator.classList.remove('status-success', 'status-error', 'status-info');
    elements.turnIndicator.textContent = "YOUR TURN! ANSWER QUICKLY!";
    if (room.state === 'playing') {
        elements.sendBtn.disabled = false;
        elements.answerInput.focus();
    }
    document.body.classList.add('active-turn');
  } else if (statusFlashActive) {
    // Don't overwrite an active flash (e.g., "Correct! ...") — let it finish
    elements.sendBtn.disabled = true;
    document.body.classList.remove('active-turn');
  } else {
    elements.turnIndicator.classList.remove('status-success', 'status-error', 'status-info');
    elements.turnIndicator.textContent = "Wait your turn...";
    elements.sendBtn.disabled = true;
    document.body.classList.remove('active-turn');
  }
});

function createPlayerCard(p, activePlayerId, isLocal = false, options = {}) {
  const { showBotDifficulty = false, isLobby = false, isHostViewer = false } = options;
  const card = document.createElement('div');
  card.className = `player-card ${p.id === activePlayerId ? 'active' : ''} ${!p.alive ? 'eliminated' : ''} ${isLocal ? 'slot-local' : ''}`;
  card.setAttribute('data-player-id', p.id);
  card.id = `player-${p.id}`;
  
  const youBadge = isLocal ? '<span class="you-badge">YOU</span>' : '';
  const botBadge = p.isBot ? '<span class="bot-badge">🤖</span>' : '';
  const hostBadge = p.isHost ? '<span class="host-badge">HOST</span>' : '';
  // Remove bot button (only for host in lobby)
  const removeBotBtn = (p.isBot && isLobby && isHostViewer && !isLocal) ? '<button class="remove-bot-btn" aria-label="Remove bot">×</button>' : '';
  // Difficulty display for bots in lobby
  const difficultyBadge = (p.isBot && showBotDifficulty && p.botDifficulty) ? `<span class="difficulty-badge">${p.botDifficulty}</span>` : '';
  
  const rarityPercent = (p.rarityPoints / 100) * 100;
  const avatarState = !p.alive ? 'chopped' : (p.id === activePlayerId ? 'panic' : 'calm');
  let livesHtml = '';
  for(let h=0; h<3; h++) {
    const filled = h < p.hearts;
    livesHtml += `<div class="stalk" style="background:${filled ? 'var(--accent-green)' : 'transparent'}; border-style:${filled ? 'solid' : 'dashed'}"></div>`;
  }
  card.innerHTML = `
    ${youBadge}
    ${botBadge}
    ${hostBadge}
    ${removeBotBtn}
    <div class="scallion-avatar">${getScallionAvatarSVG(avatarState)}</div>
    <div class="player-name">${p.nickname}</div>
    ${difficultyBadge ? `<div class="difficulty-badge-container">${difficultyBadge}</div>` : ''}
    <div class="player-stats">
      <div class="scallion-lives">${livesHtml}</div>
      <div class="rarity-bar-bg"><div class="rarity-bar-fill" style="width:${rarityPercent}%"></div></div>
    </div>
    <div class="typing-bubble"></div>
  `;
  
  // Add click handler for remove bot button
  if (removeBotBtn) {
    const btn = card.querySelector('.remove-bot-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      socket.emit('remove_bot', { roomCode: currentRoomCode, botId: p.id });
    });
  }
  
  return card;
}

function createPlaceholderCard(slotClass) {
  const card = document.createElement('div');
  card.className = `player-card placeholder`;
  card.dataset.slotClass = slotClass;
  card.innerHTML = `
    <div class="placeholder-content">
      <span class="placeholder-icon">🤖</span>
      <span class="placeholder-text">+ Bot</span>
    </div>
  `;
  
  // Click handler for host to add bot - opens modal
  card.addEventListener('click', (e) => {
    showBotDifficultyModal(slotClass);
  });
  
  return card;
}

function showBotDifficultyModal(slotClass) {
  // Remove any existing modal
  const existingModal = document.getElementById('bot-difficulty-modal');
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement('div');
  modal.id = 'bot-difficulty-modal';
  modal.className = 'bot-difficulty-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <h3>Add Bot</h3>
      <div class="difficulty-pills" id="difficulty-pills">
        <button class="difficulty-pill" data-difficulty="easy">Easy</button>
        <button class="difficulty-pill" data-difficulty="medium">Medium</button>
        <button class="difficulty-pill" data-difficulty="hard">Hard</button>
      </div>
      <div class="picker-row">
        <button class="add-bot-btn" id="modal-add-bot-btn">Add Bot</button>
      </div>
      <div class="picker-row">
        <button class="cancel-btn" id="modal-cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const addBtn = modal.querySelector('#modal-add-bot-btn');
  const cancelBtn = modal.querySelector('#modal-cancel-btn');
  const pills = modal.querySelectorAll('.difficulty-pill');
  const backdrop = modal.querySelector('.modal-backdrop');
  
  let selectedDifficulty = 'medium';
  
  // Set initial selection
  pills.forEach(pill => {
    if (pill.dataset.difficulty === selectedDifficulty) {
      pill.classList.add('selected');
    }
  });
  
  const cleanup = () => {
    modal.remove();
  };
  
  // Pill selection
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      selectedDifficulty = pill.dataset.difficulty;
    });
  });
  
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    socket.emit('add_bot', { roomCode: currentRoomCode, difficulty: selectedDifficulty, slotClass });
    cleanup();
  });
  
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanup();
  });
  
  backdrop.addEventListener('click', cleanup);
  
  // Close on Escape key
  const onEscape = (e) => {
    if (e.key === 'Escape') {
      cleanup();
      document.removeEventListener('keydown', onEscape);
    }
  };
  document.addEventListener('keydown', onEscape);
}

socket.on('answer_result', (res) => {
  if (res.valid) {
    const rarityText = res.rarity.replace('_', ' ').toUpperCase();
    flashTurnStatus(`Correct! ${rarityText} (+${res.pointsAwarded} pts)`, 'success');
  } else {
    const msg = res.reason === 'used' ? 'That answer was already used!' : 'Invalid answer!';
    flashTurnStatus(msg, 'error');
    elements.answerForm.classList.add('shake');
    setTimeout(() => elements.answerForm.classList.remove('shake'), 400);
  }
});

socket.on('puffer_exploded', (data) => {
  addEventLog(`${data.playerName} got chopped!`);
  document.querySelectorAll('.player-card').forEach(card => {
    card.classList.remove('panic-shake', 'board-shake');
  });
  const board = document.querySelector('.chopping-block');
  if (board) board.classList.remove('board-shake');
  const flash = document.createElement('div');
  flash.className = 'screen-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);
});

socket.on('round_intermission', (data) => {
  elements.sendBtn.disabled = true;
  isMyTurn = false;
  elements.recentAnswers.innerHTML = '';
  // Show loading state in prompt banner during countdown
  elements.promptBanner.textContent = 'Loading prompt...';
  elements.promptBanner.classList.remove('ticket-swap');
  
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
  if (!currentRoomCode) return;
  roomPhase = 'post_game';
  isPostGameShowcase = true;

  document.querySelectorAll('.player-card').forEach(card => {
    card.classList.remove('panic-shake', 'board-shake');
  });
  const board = document.querySelector('.chopping-block');
  if (board) board.classList.remove('board-shake');
  if (elements.centerCleaver) elements.centerCleaver.classList.remove('cleaver-panic');
  if (elements.timerBarFill) elements.timerBarFill.style.width = '0%';

  lastWinnerId = data.winnerId ? data.winnerId : null;
  lastWinnerName = data.winnerName || 'No one';
  addEventLog(`Game over! ${lastWinnerName} wins!`);

  // Transition back to waiting room with winner banner
  showView('waiting');

  // Hide room meta, show winner banner
  const meta = document.getElementById('waiting-room-meta');
  if (meta) meta.classList.add('hidden');

  const banner = elements.waitingWinnerBanner;
  if (banner && lastWinnerName) {
    banner.textContent = `👑 ${lastWinnerName} WINS!`;
    banner.classList.remove('hidden');
  }

  // Re-render waiting arena with winner/dead states (no placeholders on victory screen)
  const stage = elements.waitingArenaStage;
  if (stage && data.players) {
    const me = data.players.find(p => p.id === socket.id);
    renderArenaPlayers(stage, data.players, {
      activePlayerId: null,
      isLocal: true,
      isWaitingRoom: true,
      isHost: me?.isHost || false,
      isLobby: false, // No placeholders on victory screen
      isHostViewer: me?.isHost || false,
    });
  }

  const countEl = document.getElementById('waiting-player-count');
  if (countEl && data.players) countEl.textContent = `${data.players.length} / 6`;

  const me = data.players.find(p => p.id === socket.id);
  const isHost = me && me.isHost;

  // Post-game controls: hide START GAME, keep LEAVE ROOM visible
  elements.btnStart.classList.add('hidden');
  elements.btnLeaveRoom.classList.remove('hidden');

  const hostMsg = document.getElementById('waiting-host-message');
  if (hostMsg) hostMsg.classList.add('hidden');

  // Start countdown to auto-return to lobby
  let returnSeconds = data.returnDelayMs / 1000 || 5;
  if (elements.waitingStatusEl) {
    elements.waitingStatusEl.textContent = `Returning to lobby in ${returnSeconds}...`;
    elements.waitingStatusEl.classList.remove('hidden');
  }

  if (returnCountdownInterval) {
    clearInterval(returnCountdownInterval);
  }
  returnCountdownInterval = setInterval(() => {
    returnSeconds--;
    if (returnSeconds <= 0) {
      clearInterval(returnCountdownInterval);
      returnCountdownInterval = null;
      if (elements.waitingStatusEl) {
        elements.waitingStatusEl.textContent = '';
        elements.waitingStatusEl.classList.add('hidden');
      }
    } else {
      elements.waitingStatusEl.textContent = `Returning to lobby in ${returnSeconds}...`;
    }
  }, 1000);
});

socket.on('lobby_ready', (data) => {
  // Debounce: ignore stale update for room we just left
  if (justLeftRoomCode && data?.code === justLeftRoomCode) {
    console.log('[lobby_ready] debounce: ignoring stale update for just-left room', justLeftRoomCode);
    return;
  }
  // Membership guard: ignore if we're not in the new room
  if (data && Array.isArray(data.room?.players) && !data.room.players.some(p => p.id === socket.id)) return;

  resetPostGameState();
  // Explicitly clear any lingering countdown text
  if (elements.waitingStatusEl) {
    elements.waitingStatusEl.textContent = '';
    elements.waitingStatusEl.classList.add('hidden');
  }
  currentRoomCode = data.code;
  roomPhase = data.room.state || data.room.phase || 'lobby';

  const stage = elements.waitingArenaStage;
  if (stage && data.room.players) {
    const me = data.room.players.find(p => p.id === socket.id);
    renderArenaPlayers(stage, data.room.players, {
      activePlayerId: null,
      isLocal: true,
      isWaitingRoom: true,
      isHost: me?.isHost || false,
      isLobby: me?.isHost || false, // Host sees placeholders for empty human slots
      isHostViewer: me?.isHost || false,
      localPlayer: me,
    });
  }

  const countEl = document.getElementById('waiting-player-count');
  if (countEl && data.room.players) countEl.textContent = `${data.room.players.length} / 6`;

  elements.waitingCode.textContent = data.room.code;
  elements.waitingCategory.textContent = data.room.category || 'All Categories';

  const me = data.room.players.find(p => p.id === socket.id);
  const isHost = me && me.isHost;

  elements.btnStart.classList.toggle('hidden', !me || !me.isHost);

  const hostMsg = document.getElementById('waiting-host-message');
  if (hostMsg) hostMsg.classList.toggle('hidden', isHost);

  showView('waiting');
});

socket.on('error_msg', (code) => {
  console.log('[error_msg] received', code);
  const msg = ERROR_MAP[code] || code;
  showToast(msg, 'error');
});

socket.on('remove_bot', (data) => {
  console.log('[remove_bot] received', data);
  // The room_updated event will handle the UI update
});

socket.on('player_typing', ({ playerId, text }) => {
  const card = document.querySelector(`.player-card[data-player-id="${playerId}"]`);
  if (!card) return;
  const bubble = card.querySelector('.typing-bubble');
  if (!bubble) return;
  
  bubble.textContent = text;
  bubble.classList.toggle('visible', text.trim().length > 0);
});

// --- UI Interactions ---

document.getElementById('btn-create').onclick = () => {
  const nickname = elements.nickname.value.trim();
  if (!nickname) return showToast('Please enter a nickname', 'error');
  const settings = {};
  console.log('[btn-create] emitting create_room', { nickname, category: selectedCategory, settings });
  socket.emit('create_room', { nickname, category: selectedCategory, settings });
};

document.getElementById('btn-join').onclick = () => {
  const nickname = elements.nickname.value.trim();
  const roomCode = elements.roomCode.value.trim().toUpperCase();
  if (!nickname) return showToast('Please enter a nickname', 'error');
  if (!roomCode) return showToast('Please enter a room code', 'error');
  socket.emit('join_room', { roomCode, nickname });
};

elements.btnStart.onclick = () => {
  socket.emit('start_game', { roomCode: currentRoomCode });
};

elements.btnLeaveRoom.onclick = () => {
  const codeToLeave = currentRoomCode;
  if (codeToLeave) justLeftRoomCode = codeToLeave;
  currentRoomCode = null;
  resetPostGameState();
  showView('lobby');
  socket.emit('leave_room', { roomCode: codeToLeave });
  // Clear debounce after a tick so subsequent joins work
  setTimeout(() => { justLeftRoomCode = null; }, 0);
};

function handleAnswerSubmit() {
  if (elements.sendBtn.disabled) return;
  const text = elements.answerInput.value.trim();
  if (!text) return;
  socket.emit('submit_answer', { roomCode: currentRoomCode, text });
  elements.answerInput.value = '';
}

elements.answerForm.onsubmit = (e) => {
  e.preventDefault();
  handleAnswerSubmit();
};

elements.sendBtn.onclick = (e) => {
  e.preventDefault();
  handleAnswerSubmit();
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
  if (!currentRoomCode) return;
  if (typingTimeout) return;
  typingTimeout = setTimeout(() => {
    socket.emit('typing_update', { roomCode: currentRoomCode, text });
    typingTimeout = null;
  }, 60);
};

function updateFuseUI() {
  if (currentFuseEndsAt && currentFuseDuration) {
    const remaining = Math.max(0, currentFuseEndsAt - Date.now());
    const percent = (remaining / currentFuseDuration) * 100;
    if (elements.timerBarFill) {
      elements.timerBarFill.style.width = `${percent}%`;
      
      // Progressive cleaver vibration stages
      const cleaverSvg = elements.centerCleaver?.querySelector('svg');
      if (cleaverSvg) {
        // Remove all vibration classes first
        cleaverSvg.classList.remove('cleaver-vibrate-horizontal', 'cleaver-vibrate-diagonal-gentle', 'cleaver-vibrate-diagonal-moderate', 'cleaver-vibrate-diagonal-intense', 'cleaver-vibrate-diagonal-final');
        
        if (percent < 15) {
          // Stage 5: Final - diagonal intense + 10% larger
          cleaverSvg.classList.add('cleaver-vibrate-diagonal-final');
        } else if (percent < 40) {
          // Stage 4: Diagonal intense
          cleaverSvg.classList.add('cleaver-vibrate-diagonal-intense');
        } else if (percent < 70) {
          // Stage 3: Diagonal moderate
          cleaverSvg.classList.add('cleaver-vibrate-diagonal-moderate');
        } else if (percent < 85) {
          // Stage 2: Diagonal gentle
          cleaverSvg.classList.add('cleaver-vibrate-diagonal-gentle');
        } else if (percent <= 100) {
          // Stage 1: Horizontal gentle (parallel to floor)
          cleaverSvg.classList.add('cleaver-vibrate-horizontal');
        }
        // Above 100%: calm horizontal (no vibration class)
      }
      
      // Player panic shake at <30%
      if (percent < 30) {
        let activeCard = document.querySelector('.player-card.active');
        if (!activeCard && currentActivePlayerId) {
          activeCard = document.getElementById(`player-${currentActivePlayerId}`);
        }
        if (activeCard) activeCard.classList.add('panic-shake');
      } else {
        document.querySelectorAll('.panic-shake').forEach(el => el.classList.remove('panic-shake'));
      }
    }
  } else if (currentFuseEndsAt) {
    if (elements.timerBarFill) elements.timerBarFill.style.width = `100%`;
    // Reset cleaver to calm (horizontal)
    const cleaverSvg = elements.centerCleaver?.querySelector('svg');
    if (cleaverSvg) {
      cleaverSvg.classList.remove('cleaver-vibrate-horizontal', 'cleaver-vibrate-diagonal-gentle', 'cleaver-vibrate-diagonal-moderate', 'cleaver-vibrate-diagonal-intense', 'cleaver-vibrate-diagonal-final');
    }
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
