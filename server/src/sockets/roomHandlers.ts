import { Socket, Server } from 'socket.io';
import { RoomService } from '../services/roomService.js';
import { RoundService } from '../services/roundService.js';
import { DifficultyTier, RoomSettings } from '../types/room.types.js';

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  onRoundTimeout: (roomCode: string) => Promise<void>
) {
  // room:create
  socket.on('room:create', async (payload: { playerName: string; settings?: Partial<RoomSettings>; avatarSeed?: string }, callback) => {
    try {
      const { playerName, settings, avatarSeed } = payload || {};
      const result = await RoomService.createRoom(playerName, settings, avatarSeed);
      
      await RoomService.registerPlayerSocket(result.room.roomCode, result.hostPlayer.id, socket.id);
      socket.join(result.room.roomCode);
      socket.data.roomCode = result.room.roomCode;
      socket.data.playerId = result.hostPlayer.id;

      if (typeof callback === 'function') {
        callback({ success: true, roomCode: result.room.roomCode, token: result.token, player: result.hostPlayer });
      }
      
      io.to(result.room.roomCode).emit('room:state', result.room);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to create room';
      socket.emit('error', { code: 'ROOM_CREATE_FAILED', message });
      if (typeof callback === 'function') callback({ success: false, error: message });
    }
  });

  // room:join
  socket.on('room:join', async (payload: { roomCode: string; playerName: string; avatarSeed?: string; existingPlayerId?: string }, callback) => {
    try {
      const { roomCode, playerName, avatarSeed, existingPlayerId } = payload || {};
      if (!roomCode) throw new Error('Room code is required');

      const result = await RoomService.joinRoom(roomCode, playerName, avatarSeed, existingPlayerId);
      
      await RoomService.registerPlayerSocket(result.room.roomCode, result.player.id, socket.id);
      socket.join(result.room.roomCode);
      socket.data.roomCode = result.room.roomCode;
      socket.data.playerId = result.player.id;

      if (typeof callback === 'function') {
        callback({ success: true, roomCode: result.room.roomCode, token: result.token, player: result.player });
      }

      io.to(result.room.roomCode).emit('room:state', result.room);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to join room';
      socket.emit('error', { code: 'ROOM_JOIN_FAILED', message });
      if (typeof callback === 'function') callback({ success: false, error: message });
    }
  });

  // room:leave
  socket.on('room:leave', async () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    socket.leave(roomCode);
    const result = await RoomService.leaveRoom(roomCode, playerId);
    if (result.room) {
      io.to(roomCode).emit('room:state', result.room);
    }
    socket.data.roomCode = undefined;
    socket.data.playerId = undefined;
  });

  // room:startGame
  socket.on('room:startGame', async () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = await RoomService.getRoom(roomCode);
    if (!room) return;

    // Only host can start game
    if (room.hostId !== playerId) {
      socket.emit('error', { code: 'NOT_HOST', message: 'Only the host can start the game.' });
      return;
    }

    const roundData = await RoundService.startNextRound(roomCode, onRoundTimeout);
    if (!roundData) {
      socket.emit('error', { code: 'START_FAILED', message: 'Cannot start round (not enough players).' });
      return;
    }

    const { room: updatedRoom, currentRound, drawer } = roundData;

    // Broadcast room state
    io.to(roomCode).emit('room:state', updatedRoom);

    // Public round start hint broadcast
    io.to(roomCode).emit('round:start', {
      roundNumber: currentRound.roundNumber,
      drawerId: currentRound.drawerId,
      drawerName: drawer.name,
      wordHint: currentRound.wordHint,
      category: currentRound.category,
      difficulty: currentRound.difficulty,
      endsAt: currentRound.endsAt,
    });

    // Drawer private secret word event
    if (drawer.socketId) {
      io.to(drawer.socketId).emit('round:startDrawer', {
        word: currentRound.word,
        category: currentRound.category,
      });
    }
  });

  // difficulty:vote
  socket.on('difficulty:vote', async (payload: { tier: DifficultyTier }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId || !payload?.tier) return;

    const updatedRoom = await RoomService.voteDifficulty(roomCode, playerId, payload.tier);
    if (updatedRoom) {
      io.to(roomCode).emit('room:state', updatedRoom);
    }
  });
}
