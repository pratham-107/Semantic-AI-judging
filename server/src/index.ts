import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './services/roomService.js';
import { RoundService } from './services/roundService.js';
import { dbService } from './services/dbService.js';
import { registerRoomHandlers } from './sockets/roomHandlers.js';
import { registerGameHandlers } from './sockets/gameHandlers.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'sketchai-production-secret-key-super-secure';

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
app.all('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sketchai-game-server',
    timestamp: Date.now(),
  });
});

app.all('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sketchai-game-server',
    timestamp: Date.now(),
  });
});

// --- AUTHENTICATION ROUTES ---

// 1. Guest login (anonymous fast-play)
app.post('/auth/guest', (req, res) => {
  const { name } = req.body || {};
  const playerName = name?.trim() || 'Guest';
  const playerId = uuidv4();
  const token = RoomService.generatePlayerToken(playerId, '', playerName);
  res.json({ playerId, playerName, token, isGuest: true });
});

// 2. Persistent User Registration
app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (username.length < 3 || username.length > 24) {
      return res.status(400).json({ error: 'Username must be between 3 and 24 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await dbService.findUserByEmailOrUsername(email);
    if (existing) {
      return res.status(409).json({ error: 'A student account with this email or username already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await dbService.createUser(username.trim(), email.trim(), passwordHash);
    const token = RoomService.generatePlayerToken(user.id, '', user.username);
    const stats = await dbService.getUserStats(user.username);

    res.status(201).json({
      user: { id: user.id, username: user.username, email: user.email },
      token,
      stats,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message || 'Registration failed' });
  }
});

// 3. Persistent User Login
app.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required.' });
    }

    const user = await dbService.findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const token = RoomService.generatePlayerToken(user.id, '', user.username);
    const stats = await dbService.getUserStats(user.username);

    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token,
      stats,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message || 'Login failed' });
  }
});

// 4. Get Current Logged-in User Profile & Stats
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { playerId: string; playerName: string };

    const user = await dbService.findUserById(decoded.playerId);
    const stats = await dbService.getUserStats(decoded.playerName);

    res.json({
      user: user ? { id: user.id, username: user.username, email: user.email } : { id: decoded.playerId, username: decoded.playerName },
      stats,
    });
  } catch {
    res.status(401).json({ error: 'Session expired or invalid' });
  }
});

app.get('/room/:code', async (req, res) => {
  const room = await RoomService.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

app.get('/leaderboard', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const leaderboard = await dbService.getLeaderboard(limit);
  res.json({ leaderboard });
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
    // Asynchronously persist completed match to database
    dbService.saveMatch(room, gameEndPayload);
  } else {
    // Cooldown countdown before starting next round automatically
    setTimeout(async () => {
      const currentRoom = await RoomService.getRoom(roomCode);
      if (currentRoom && currentRoom.status === 'IN_PROGRESS') {
        const nextRoundData = await RoundService.startNextRound(roomCode, handleRoundEnd);
        if (nextRoundData) {
          const { room: updatedRoom, currentRound, drawer } = nextRoundData;
          io.to(roomCode).emit('stroke:clear');
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
