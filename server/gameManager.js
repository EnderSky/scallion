'use strict';

const EventEmitter = require('node:events');
const { getRandomPrompt, validateAnswer, normalize } = require('./questionLoader');

const RARITY_POINTS = { common: 10, uncommon: 20, rare: 35, deep_cut: 50, one_in_a_krillion: 100 };
const START_HEARTS = 2;
const MAX_HEARTS = 3;
const MIN_FUSE_MS = 12000; // Range: 12-30s
const MAX_FUSE_MS = 30000;
const MIN_TURN_WINDOW_MS = 8000; // Increased: bump to 8s
const POINTS_PER_HEART = 100;
const MAX_PLAYERS = 6;

// Bot configuration (for lobby-added bots)
const BOT_NAMES = [
  'BasilGPT', 'ThymeAI', 'SageBot', 'RosemaryLLM', 'Minty',
  'ParsleyAI', 'CilantroGPT', 'DillBERT', 'ThymeBot', 'SageMind',
  'OreganoAI', 'MintyLLM', 'BasilBot', 'ChiveGPT', 'SageAI'
];

const BOT_DELAYS = {
  easy: [3000, 6000],    // Slower: 3-6 seconds
  medium: [2000, 4000],  // Slower: 2-4 seconds
  hard: [1000, 2500]     // Slower: 1-2.5 seconds
};

const BOT_TYPO_RATES = {
  easy: 0.3,
  medium: 0.1,
  hard: 0
};

// Chance for bot to fail to answer in time (forfeit turn)
const BOT_NO_ANSWER_CHANCE = {
  easy: 0.35,   // 35% chance to not answer
  medium: 0.15, // 15% chance to not answer
  hard: 0.03    // 3% chance to not answer
};

const BOT_RARITY_WEIGHTS = {
  easy: { common: 1, uncommon: 1, rare: 1, deep_cut: 1, one_in_a_krillion: 1 },
  medium: { common: 1, uncommon: 1.5, rare: 2, deep_cut: 3, one_in_a_krillion: 4 },
  hard: { common: 1, uncommon: 2, rare: 4, deep_cut: 8, one_in_a_krillion: 16 }
};

// Human slot assignment order: left-to-right, top-to-bottom
// These are the display slots for OTHER humans on your screen.
// Local player (YOU) always renders at slot-local (bottom).
const HUMAN_SLOT_ORDER = ['slot-top-left', 'slot-top', 'slot-top-right', 'slot-mid-left', 'slot-mid-right'];

// All compass slots (for bots and game redistribution)
const COMPASS_SLOTS = ['slot-top', 'slot-top-left', 'slot-top-right', 'slot-mid-left', 'slot-mid-right'];

// Slot priority for bots when auto-placing (not used when host clicks specific slot)
const SLOT_PRIORITY = [...COMPASS_SLOTS];

// Server no longer assigns human display slots.
// Humans rendered in join order; client computes display by skipping self.
// Bots keep their explicitly assigned slots.

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

function createBot(difficulty, slotClass, usedNames = []) {
  // Filter out already used names
  const availableNames = BOT_NAMES.filter(name => !usedNames.includes(name));
  const namePool = availableNames.length > 0 ? availableNames : BOT_NAMES;
  const index = Math.floor(Math.random() * namePool.length);
  const nickname = namePool[index];
  const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    nickname,
    isBot: true,
    botDifficulty: difficulty,
    slotClass,
    hearts: START_HEARTS,
    maxHearts: MAX_HEARTS,
    rarityPoints: 0,
    alive: true,
    isHost: false
  };
}

function getNextEmptySlot(room) {
  const occupied = new Set(room.players.map(p => p.slotClass).filter(Boolean));
  return SLOT_PRIORITY.find(s => !occupied.has(s)) || null;
}

// Bot answer selection
function introduceTypo(text, difficulty) {
  if (!text || text.length < 2) return text;
  const chars = text.split('');
  const ops = ['insert', 'delete', 'swap', 'replace'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const idx = Math.floor(Math.random() * chars.length);
  
  switch (op) {
    case 'insert':
      chars.splice(idx, 0, 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]);
      break;
    case 'delete':
      if (chars.length > 1) chars.splice(idx, 1);
      break;
    case 'swap':
      if (idx < chars.length - 1) {
        [chars[idx], chars[idx + 1]] = [chars[idx + 1], chars[idx]];
      }
      break;
    case 'replace':
      chars[idx] = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      break;
  }
  return chars.join('');
}

function pickBotAnswer(room, bot) {
  const prompt = room.currentPrompt;
  if (!prompt || !prompt.answers?.length) return null;

  // Flatten all valid answer forms with their rarity
  const allAnswers = prompt.answers.flatMap(a => {
    const forms = [a.answer, ...(a.aliases || [])];
    return forms.map(f => ({ text: f, rarity: a.rarity, canonical: a.answer }));
  });

  // Filter out already used answers (normalize check)
  const used = new Set(room.usedAnswers.map(normalize));
  const available = allAnswers.filter(a => !used.has(normalize(a.text)));

  if (available.length === 0) return null;

  // Weight by difficulty
  const weights = BOT_RARITY_WEIGHTS[bot.botDifficulty] || BOT_RARITY_WEIGHTS.medium;
  const weighted = available.map(a => ({
    ...a,
    weight: weights[a.rarity] || 1
  }));
  const totalWeight = weighted.reduce((sum, a) => sum + a.weight, 0);
  let rand = Math.random() * totalWeight;
  let pick = weighted[0];
  for (const a of weighted) {
    rand -= a.weight;
    if (rand <= 0) { pick = a; break; }
  }

  // Apply typo chance
  let finalText = pick.text;
  const typoRate = BOT_TYPO_RATES[bot.botDifficulty] || 0;
  if (typoRate > 0 && Math.random() < typoRate) {
    finalText = introduceTypo(finalText, bot.botDifficulty);
  }

  return finalText;
}

function getBotDelay(difficulty) {
  const [min, max] = BOT_DELAYS[difficulty] || BOT_DELAYS.medium;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Bot turn triggering
function maybeTriggerBotTurn(room) {
  const active = room.players.find(p => p.id === room.activePlayerId);
  if (active?.isBot && room.state === 'playing') {
    const delay = getBotDelay(active.botDifficulty);
    setTimeout(() => {
      const r = rooms.get(room.code);
      if (r && r.state === 'playing' && r.activePlayerId === active.id) {
        // Chance to not answer (forfeit turn)
        const noAnswerChance = BOT_NO_ANSWER_CHANCE[active.botDifficulty] || 0;
        if (Math.random() < noAnswerChance) {
          // Bot fails to answer - let the fuse expire naturally
          return;
        }
        const answer = pickBotAnswer(r, active);
        if (answer) {
          submitAnswer(r.code, active.id, answer);
        }
      }
    }, delay);
  }
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
  const aliveHumans = alive.filter(p => !p.isBot);
  const aliveBots = alive.filter(p => p.isBot);
  
  // Game ends when NO humans are alive
  if (aliveHumans.length === 0) {
    // Select bot with highest health as winner (random if tied)
    let winner = null;
    if (aliveBots.length > 0) {
      // Find max health among alive bots
      const maxHealth = Math.max(...aliveBots.map(b => b.hearts));
      const topBots = aliveBots.filter(b => b.hearts === maxHealth);
      // Randomly select from top bots if tied
      winner = topBots[Math.floor(Math.random() * topBots.length)];
      
      // Mark other bots as dead so they display as dead before victory screen
      aliveBots.forEach(bot => {
        if (bot.id !== winner.id) {
          bot.alive = false;
        }
      });
    }
    endGame(room, winner);
    return true;
  }
  
  // Game also ends if only 1 human remains (and no other humans can join mid-game)
  if (aliveHumans.length === 1 && aliveBots.length === 0) {
    endGame(room, aliveHumans[0]);
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
      maybeTriggerBotTurn(r);
    }
  }, 3000);
}

// ---------- Public API ----------

function createRoom(hostId, hostNickname, category, settings = {}) {
  const code = generateRoomCode();
  const host = makePlayer(hostId, hostNickname || 'Host', true);
  // No slot assignment needed - client computes display by skipping self
  host.slotClass = null;
  const room = {
    code,
    hostId,
    category: category || 'All',
    state: 'lobby',
    players: [host],
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
    settings: { ...settings }
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
  
  const player = makePlayer(playerId, finalNickname, false);
  player.slotClass = null; // No server-assigned display slot
  room.players.push(player);
  
  // No server-side human slot assignment needed - client computes display
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
    // Find next human player (not a bot) to be host
    const nextHuman = room.players.find(p => !p.isBot);
    if (nextHuman) {
      room.hostId = nextHuman.id;
      nextHuman.isHost = true;
    } else {
      // No humans left - don't promote bots to host
      // The room will have no host until a human joins
      room.hostId = null;
    }
  }

  // No server-side human slot reassignment needed - client computes display
  if (room.state === 'playing') {
    // checkWinOrContinue handles all win conditions correctly:
    // - 0 humans alive → game ends
    // - 1 human + 0 bots → game ends
    // - 1 human + bots → game continues
    if (checkWinOrContinue(room)) return { ok: true, room: snapshot(room) };
    if (wasActive) room.activePlayerId = nextAliveId(room, playerId) || alivePlayers(room)[0].id;
  }

  emitUpdate(room);
  return { ok: true, room: snapshot(room) };
}

// Bot management (lobby only)
function addBot(code, difficulty, slotClass) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.state !== 'lobby') return { ok: false, error: 'not_in_lobby' };
  if (room.players.length >= MAX_PLAYERS) return { ok: false, error: 'room_full' };
  if (!['easy', 'medium', 'hard'].includes(difficulty)) return { ok: false, error: 'invalid_difficulty' };
  // Validate against compass slots only (slot-local is client-side only)
  if (!slotClass || !COMPASS_SLOTS.includes(slotClass)) return { ok: false, error: 'invalid_slot' };

  // Check if the requested slot is available
  const occupied = new Set(room.players.map(p => p.slotClass).filter(Boolean));
  if (occupied.has(slotClass)) {
    return { ok: false, error: 'slot_occupied' };
  }

  // Get used bot names to ensure uniqueness
  const usedNames = room.players.filter(p => p.isBot).map(p => p.nickname);
  const bot = createBot(difficulty, slotClass, usedNames);
  room.players.push(bot);
  
  // No human slot reassignment needed - client computes display
  emitUpdate(room);
  return { ok: true, room: snapshot(room), bot };
}

function removeBot(code, botId) {
  const room = rooms.get(String(code || '').toUpperCase());
  if (!room) return { ok: false, error: 'room_not_found' };
  if (room.state !== 'lobby') return { ok: false, error: 'not_in_lobby' };

  const idx = room.players.findIndex((p) => p.id === botId && p.isBot);
  if (idx === -1) return { ok: false, error: 'bot_not_found' };

  room.players.splice(idx, 1);
  
  // No human slot reassignment needed - client computes display
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
  
  // No server-side redistribution needed - client computes display by skipping self
  // Players keep their bot-assigned slots; humans have null slotClass
  
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
      maybeTriggerBotTurn(r);
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
  maybeTriggerBotTurn(room);

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
  addBot,
  removeBot,
  on: (event, cb) => bus.on(event, cb),
  RARITY_POINTS,
  MAX_HEARTS,
  START_HEARTS,
};
