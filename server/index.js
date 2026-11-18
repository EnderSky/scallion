'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const gameManager = require('./gameManager');
const questionLoader = require('./questionLoader');

const app = express();
const server = createServer(app);

// 1. Proxy and Health
app.set('trust proxy', 1);
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 2. Static Files
app.use(express.static(path.join(__dirname, '..', 'public')));

// 3. Socket.io Config
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 20000,
});

// --- Game Manager Event Wiring ---

gameManager.on('room:update', (snapshot) => {
  if (snapshot.state === 'playing' || snapshot.state === 'intermission') {
    io.to(snapshot.code).emit('game_state', snapshot);
  } else if (snapshot.state === 'lobby') {
    io.to(snapshot.code).emit('room_updated', snapshot);
  }
});

gameManager.on('fuse:expired', (data) => {
  io.to(data.code).emit('puffer_exploded', data);
});

gameManager.on('round_intermission', (data) => {
  io.to(data.code).emit('round_intermission', data);
});

gameManager.on('game:over', (data) => {
  io.to(data.code).emit('game_over', data);
});

// --- Socket Event Handlers ---

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('get_categories', () => {
    socket.emit('categories_list', questionLoader.getCategories());
  });

  socket.on('request_game_state', ({ roomCode }) => {
    const state = gameManager.getRoomState(roomCode);
    if (state) socket.emit('game_state', state);
  });

  socket.on('create_room', ({ nickname, category }) => {
    const res = gameManager.createRoom(socket.id, nickname, category);
    if (res.ok) {
      socket.roomCode = res.room.code;
      socket.join(res.room.code);
      socket.emit('room_updated', res.room);
    } else {
      socket.emit('error_msg', res.error);
    }
  });

  socket.on('join_room', ({ roomCode, nickname }) => {
    const code = (roomCode || '').toUpperCase();
    const res = gameManager.joinRoom(code, socket.id, nickname);
    if (res.ok) {
      socket.roomCode = code;
      socket.join(code);
      socket.emit('room_updated', res.room);
    } else {
      socket.emit('error_msg', res.error);
    }
  });

  socket.on('start_game', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase();
    const res = gameManager.startGame(code, socket.id);
    if (res.ok) {
      io.to(code).emit('game_state', res.room);
    } else {
      socket.emit('error_msg', res.error);
    }
  });

  socket.on('submit_answer', ({ roomCode, text }) => {
    const code = (roomCode || '').toUpperCase();
    const res = gameManager.submitAnswer(code, socket.id, text);
    if (res.ok) {
      socket.emit('answer_result', {
        valid: true,
        ...res.result,
      });
      io.to(code).emit('game_state', res.room);
    } else {
      socket.emit('answer_result', {
        valid: false,
        reason: res.reason,
        matchedAnswer: res.matchedAnswer,
      });
    }
  });

  socket.on('typing_update', ({ roomCode, text }) => {
    const code = (roomCode || '').toUpperCase();
    socket.to(code).emit('player_typing', {
      playerId: socket.id,
      text: text,
    });
  });

  socket.on('play_again', ({ roomCode }) => {
    const code = (roomCode || '').toUpperCase();
    const room = gameManager.getInternalRoom(code);
    
    if (!room) {
      return socket.emit('error_msg', 'room_not_found');
    }
    if (room.hostId !== socket.id) {
      return socket.emit('error_msg', 'not_host');
    }

    room.players.forEach(p => {
      p.hearts = 2; 
      p.alive = true;
      p.rarityPoints = 0;
    });

    room.state = 'lobby'; 
    const res = gameManager.startGame(code, socket.id);
    if (res.ok) {
      io.to(code).emit('game_state', res.room);
    } else {
      socket.emit('error_msg', res.error);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomCode) {
      gameManager.removePlayer(socket.roomCode, socket.id);
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const net of Object.values(nets)) {
    for (const iface of net) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  console.log(`Server running on port ${PORT}`);
  console.log(`Local network access: http://${addresses.join(' or ')}:${PORT}`);
  console.log(`Localhost access: http://localhost:${PORT}`);
});
