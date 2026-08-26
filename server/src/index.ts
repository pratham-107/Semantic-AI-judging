import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './services/roomService.js';
import { RoundService } from './services/roundService.js';
import { registerRoomHandlers } from './sockets/roomHandlers.js';
import { registerGameHandlers } from './sockets/gameHandlers.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// REST Endpoints
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sketchai-game-server',
    timestamp: Date.now(),
  });
});

app.post('/auth/guest', (req, res) => {
  const { name } = req.body || {};
  const playerName = name?.trim() || 'Guest';
  const playerId = uuidv4();
  const token = RoomService.generatePlayerToken(playerId, '', playerName);
  res.json({ playerId, playerName, token });
});

app.get('/room/:code', async (req, res) => {
  const room = await RoomService.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// Authoritative round timeout / end handler
async function handleRoundEnd(roomCode: string) {
  const result = await RoundService.endRound(roomCode);
  if (!result) return;

  const { room, roundEndPayload, gameEndPayload } = result;

  // Broadcast round:end with drawer accuracy breakdown
  io.to(roomCode).emit('round:end', roundEndPayload);
  io.to(roomCode).emit('room:state', room);

  if (gameEndPayload) {
    io.to(roomCode).emit('game:end', gameEndPayload);
  } else {
    // Cooldown countdown before starting next round automatically
    setTimeout(async () => {
      const currentRoom = await RoomService.getRoom(roomCode);
      if (currentRoom && currentRoom.status === 'IN_PROGRESS') {
        const nextRoundData = await RoundService.startNextRound(roomCode, handleRoundEnd);
        if (nextRoundData) {
          const { room: updatedRoom, currentRound, drawer } = nextRoundData;
          io.to(roomCode).emit('room:state', updatedRoom);
          io.to(roomCode).emit('round:start', {
            roundNumber: currentRound.roundNumber,
            drawerId: currentRound.drawerId,
            drawerName: drawer.name,
            wordHint: currentRound.wordHint,
            category: currentRound.category,
            difficulty: currentRound.difficulty,
            endsAt: currentRound.endsAt,
          });

          if (drawer.socketId) {
            io.to(drawer.socketId).emit('round:startDrawer', {
              word: currentRound.word,
              category: currentRound.category,
            });
          }
        }
      }
    }, 6000);
  }
}

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Register domain handlers
  registerRoomHandlers(io, socket, handleRoundEnd);
  registerGameHandlers(io, socket, handleRoundEnd);

  // Disconnect handling with host migration
  socket.on('disconnect', async () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const result = await RoomService.handleDisconnect(socket.id);
    if (result && result.room) {
      io.to(result.room.roomCode).emit('room:state', result.room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(` SketchAI Game Server running on http://localhost:${PORT}`);
});
