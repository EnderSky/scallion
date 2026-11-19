'use strict';

const EventEmitter = require('node:events');
const { getRandomPrompt, validateAnswer } = require('./questionLoader');

const RARITY_POINTS = { common: 10, uncommon: 20, rare: 35, deep_cut: 50, one_in_a_krillion: 100 };
const START_HEARTS = 2;
const MAX_HEARTS = 3;
const MIN_FUSE_MS = 18000; // Increased: 18-32s range
const MAX_FUSE_MS = 32000;
const MIN_TURN_WINDOW_MS = 8000; // Increased: bump to 8s
const POINTS_PER_HEART = 100;
const MAX_PLAYERS = 6;

const rooms = new Map();

function resetPlayerStates(room) {
  room.players.forEach((p) => {
    p.hearts = START_HEARTS;
    p.alive = true;
    p.rarityPoints = 0;
  });
}

function resetRoomToLobby(oldCode) {
  const room = rooms.get(String(oldCode || '').toUpperCase());
  if (!room) return null;

  clearFuse(room);
  if (room.returnTimer) {
    clearTimeout(room.returnTimer);
    room.returnTimer = null;
  }

  // Generate a brand-new unique room code
  const newCode = generateRoomCode();

  // Remove old code entry, store under new code
  rooms.delete(oldCode);
  room.code = newCode;
  rooms.set(newCode, room);

  // Reset room to lobby state
  room.state = 'lobby';
  room.winner = null;
  room.currentPrompt = null;
  room.usedAnswers = [];
  room.usedAnswersList = [];
  room.usedPromptIds = [];
  room.fuseDurationMs = 0;
  room.fuseEndsAt = null;
  room.activePlayerId = null;
  resetPlayerStates(room);

  emitUpdate(room);
  return { oldCode, newCode, room };
}

const bus = new EventEmitter();
bus.setMaxListeners(100);

function randomFuseMs() {
  return Math.floor(MIN_FUSE_MS + Math.random() * (MAX_FUSE_MS - MIN_FUSE_MS + 1));
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 26)]).join('');
  } while (rooms.has(code));
  return code;
}

function makePlayer(id, nickname, isHost) {
  return { id, nickname, hearts: START_HEARTS, maxHearts: MAX_HEARTS, rarityPoints: 0, alive: true, isHost: !!isHost };
}

function alivePlayers(room) {
  return room.players.filter((p) => p.alive);
}

function activePlayer(room) {
  return room.players.find((p) => p.id === room.activePlayerId) || null;
}

function nextAliveId(room, fromId) {
  const players = room.players;
  const start = Math.max(0, players.findIndex((p) => p.id === fromId));
  for (let step = 1; step <= players.length; step++) {
    const candidate = players[(start + step) % players.length];
    if (candidate.alive) return candidate.id;
  }
  return null;
}

function clearFuse(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function snapshot(room) {
  return {
    code: room.code,
    category: room.category,
    state: room.state,
    hostId: room.hostId,
    players: room.players.map((p) => ({ ...p })),
    activePlayerId: room.activePlayerId,
    usedAnswers: [...room.usedAnswers],
    usedAnswersList: [...(room.usedAnswersList || [])], // Sync detailed list
    currentPrompt:
      room.currentPrompt
        ? { 
            id: room.currentPrompt.id, 
            prompt: room.currentPrompt.prompt, 
            category: room.currentPrompt.category 
          }
        : null,
    fuseDurationMs: room.fuseDurationMs,
    fuseEndsAt: room.fuseEndsAt,
    fuseRemainingMs: room.fuseEndsAt ? Math.max(0, room.fuseEndsAt - Date.now()) : 0,
    winner: room.winner,
  };
}

function emitUpdate(room) {
  bus.emit('room:update', snapshot(room));
}

function loadNewPrompt(room) {
  const exclude = room.usedPromptIds || [];
  const prompt = getRandomPrompt(room.category, exclude);
  if (!prompt) return null;
  
  room.currentPrompt = prompt;
  room.usedPromptIds = [...exclude, prompt.id];
  room.usedAnswers = [];
  room.usedAnswersList = []; // Clear ordered list for new prompt
  return prompt;
}

function startFuse(room, durationMs) {
  clearFuse(room);
  const ms = durationMs || randomFuseMs();
  room.fuseDurationMs = ms;
  room.fuseEndsAt = Date.now() + ms;
  room.timer = setTimeout(() => onFuseExpired(room.code), ms);
}

function endGame(room, winner) {
  clearFuse(room);
  room.state = 'game_over';
  room.winner = winner
    ? { id: winner.id, nickname: winner.nickname }
    : null;
  
  bus.emit('game:over', { 
    code: room.code, 
    winner: room.winner,
    players: room.players 
  });
}

function checkWinOrContinue(room) {
  const alive = alivePlayers(room);
  if (alive.length <= 1) {
    endGame(room, alive[0] || null);
    return true;
  }
  return false;
}

function onFuseExpired(code) {
  const room = rooms.get(code);
  if (!room || room.state !== 'playing') return;
  clearFuse(room);

  const holder = activePlayer(room);
  if (holder) {
    holder.hearts = Math.max(0, holder.hearts - 1);
    if (holder.hearts === 0) holder.alive = false;
    bus.emit('fuse:expired', { code: room.code, playerId: holder.id, playerName: holder.nickname, hearts: holder.hearts, alive: holder.alive });
  }

  if (checkWinOrContinue(room)) return;

  const prevPlayer = holder;
  room.activePlayerId = nextAliveId(room, prevPlayer ? prevPlayer.id : null);
  const nextPlayer = activePlayer(room);

  const prompt = loadNewPrompt(room);

  room.state = 'intermission';
  room.fuseDurationMs = 0;
  room.fuseEndsAt = null;

  bus.emit('round_intermission', {
    code: room.code,
    explodedPlayer: prevPlayer ? prevPlayer.nickname : 'Someone',
    nextPlayer: nextPlayer ? nextPlayer.nickname : 'Unknown',
    newPrompt: prompt,
    seconds: 3
  });

  setTimeout(() => {
    const r = rooms.get(code);
    if (r && r.state === 'intermission') {
      r.state = 'playing';
      startFuse(r);
      emitUpdate(r);
    }
  }, 3000);
}

// ---------- Public API ----------

function createRoom(hostId, hostNickname, category) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId,
    category: category || 'All',
    state: 'lobby',
    players: [makePlayer(hostId, hostNickname || 'Host', true)],
    activePlayerId: null,
    currentPrompt: null,
    usedAnswers: [],
    usedAnswersList: [],
    usedPromptIds: [],
    fuseDurationMs: 0,
    fuseEndsAt: null,
    timer: null,
    winner: null,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return { ok: true, room: snapshot(room) };
}

function joinRoom(code, playerId, playerNickname) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.state !== 'lobby') return { ok: false, error: 'game_already_started' };
  if (room.players.length >= MAX_PLAYERS) {
    return { ok: false, error: 'Room is full (max 6 players).' };
  }
  
  let finalNickname = playerNickname || 'Player';
  let counter = 2;
  while (room.players.some(p => p.nickname === finalNickname)) {
    finalNickname = `${playerNickname} (${counter++})`;
  }

  if (room.players.some((p) => p.id === playerId)) {
    return { ok: true, room: snapshot(room) };
  }
  room.players.push(makePlayer(playerId, finalNickname, false));
  emitUpdate(room);
  return { ok: true, room: snapshot(room) };
}

function removePlayer(code, playerId) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { ok: false, error: 'player_not_found' };

  const wasActive = room.state === 'playing' && room.activePlayerId === playerId;
  room.players.splice(idx, 1);

  if (room.players.length === 0) {
    clearFuse(room);
    if (room.returnTimer) {
      clearTimeout(room.returnTimer);
      room.returnTimer = null;
    }
    rooms.delete(room.code);
    return { ok: true, roomDeleted: true };
  }

  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
    room.players[0].isHost = true;
  }

  if (room.state === 'playing') {
    // End game if fewer than 2 players remain (can't play with 1)
    if (room.players.length < 2) {
      const winner = room.players[0];
      endGame(room, winner);
      return { ok: true, room: snapshot(room) };
    }
    if (checkWinOrContinue(room)) return { ok: true, room: snapshot(room) };
    if (wasActive) room.activePlayerId = nextAliveId(room, playerId) || alivePlayers(room)[0].id;
  }

  emitUpdate(room);
  return { ok: true, room: snapshot(room) };
}

function startGame(code, playerId) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.hostId !== playerId) return { ok: false, error: 'not_host' };
  if (room.state !== 'lobby') return { ok: false, error: 'already_started' };
  if (room.players.length < 2) return { ok: false, error: 'need_two_players' };

  const prompt = loadNewPrompt(room);
  if (!prompt) {
    room.state = 'lobby';
    return { ok: false, error: 'no_question_data' };
  }
  
  const firstPlayer = room.players[Math.floor(Math.random() * room.players.length)];
  room.activePlayerId = firstPlayer.id;
  room.winner = null;
  room.usedPromptIds = [];
  
  room.state = 'starting';
  
  bus.emit('game_starting', {
    code: room.code,
    firstPlayer: firstPlayer.nickname,
    category: room.category,
    seconds: 3
  });

  setTimeout(() => {
    const r = rooms.get(code);
    if (r && r.state === 'starting') {
      r.state = 'playing';
      startFuse(r);
      emitUpdate(r);
    }
  }, 3000);

  return { ok: true, room: snapshot(room) };
}

function submitAnswer(code, playerId, userInput) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.state !== 'playing') return { ok: false, error: 'not_playing' };
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'player_not_found' };
  if (!player.alive) return { ok: false, error: 'eliminated' };
  if (room.activePlayerId !== playerId) return { ok: false, error: 'not_your_turn' };

  const verdict = validateAnswer(room.currentPrompt, userInput, new Set(room.usedAnswers));
  if (!verdict.valid) return { ok: false, reason: verdict.reason, matchedAnswer: verdict.matchedAnswer };

  room.usedAnswers.push(verdict.matchedAnswer);
  // Track detailed order for state sync
  room.usedAnswersList.push({ 
    answer: verdict.matchedAnswer, 
    rarity: verdict.rarity 
  });

  const points = RARITY_POINTS[verdict.rarity] || 0;
  player.rarityPoints += points;

  let heartGranted = false;
  if (player.rarityPoints >= POINTS_PER_HEART && player.hearts < player.maxHearts) {
    player.hearts += 1;
    player.rarityPoints -= POINTS_PER_HEART;
    heartGranted = true;
  }

  room.activePlayerId = nextAliveId(room, player.id) || player.id;
  
  const remaining = room.fuseEndsAt ? Math.max(0, room.fuseEndsAt - Date.now()) : 0;
  const duration = remaining < MIN_TURN_WINDOW_MS ? MIN_TURN_WINDOW_MS : null;
  startFuse(room, duration);

  emitUpdate(room);
  return {
    ok: true,
    result: { matchedAnswer: verdict.matchedAnswer, rarity: verdict.rarity, pointsAwarded: points, heartGranted, hearts: player.hearts, rarityPoints: player.rarityPoints },
    room: snapshot(room),
  };
}

function getRoomState(code) {
  const room = rooms.get(String(code || '').toUpperCase());
  return room ? snapshot(room) : null;
}

function getInternalRoom(code) {
  return rooms.get(String(code || '').toUpperCase()) || null;
}

module.exports = {
  createRoom,
  joinRoom,
  removePlayer,
  startGame,
  submitAnswer,
  getRoomState,
  getInternalRoom,
  resetRoomToLobby,
  on: (event, cb) => bus.on(event, cb),
  RARITY_POINTS,
  MAX_HEARTS,
  START_HEARTS,
};
