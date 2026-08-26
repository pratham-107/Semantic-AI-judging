import { Socket, Server } from 'socket.io';
import { RoomService } from '../services/roomService.js';
import { RoundService } from '../services/roundService.js';
import { FogService } from '../services/fogService.js';
import { StrokeData } from '../types/room.types.js';

export function registerGameHandlers(
  io: Server,
  socket: Socket,
  onRoundTimeout: (roomCode: string) => Promise<void>
) {
  // stroke:draw
  socket.on('stroke:draw', async (stroke: StrokeData) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = await RoomService.getRoom(roomCode);
    if (!room || !room.currentRound || room.status !== 'IN_PROGRESS') return;

    // Only the designated drawer can draw
    if (room.currentRound.drawerId !== playerId) return;

    const elapsedSec = (Date.now() - room.currentRound.startedAt) / 1000;

    // Update server-side revealed fog regions
    room.currentRound.revealedFogRegions = FogService.addRevealedPoint(
      room.currentRound.revealedFogRegions,
      stroke.x,
      stroke.y,
      elapsedSec
    );

    await RoomService.saveRoom(room);

    // Filter stroke server-side before sending to guessers
    const isVisible = FogService.isStrokeVisible(stroke, room.currentRound.revealedFogRegions);

    // Relay to everyone in the room except the drawer
    socket.to(roomCode).emit('stroke:broadcast', {
      playerId,
      x: stroke.x,
      y: stroke.y,
      prevX: stroke.prevX,
      prevY: stroke.prevY,
      color: stroke.color,
      width: stroke.width,
      isNewStroke: stroke.isNewStroke,
      // Pass fog visibility metadata so client canvas can also render smooth fog boundaries if desired
      revealed: isVisible,
    });
  });

  // stroke:clear
  socket.on('stroke:clear', async () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = await RoomService.getRoom(roomCode);
    if (!room || !room.currentRound || room.status !== 'IN_PROGRESS') return;
    if (room.currentRound.drawerId !== playerId) return;

    socket.to(roomCode).emit('stroke:clear');
  });

  // guess:submit
  socket.on('guess:submit', async (payload: { text: string }) => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId || !payload?.text) return;

    const result = await RoundService.processGuess(roomCode, playerId, payload.text);
    if (!result) return;

    const { room: updatedRoom, guessResult, correctAnnounce, shouldEndRound } = result;

    // Private warmth & result to the guesser
    socket.emit('guess:result', guessResult);

    // Broadcast correct announcement if correct (without revealing guess text)
    if (correctAnnounce) {
      io.to(roomCode).emit('guess:correctAnnounce', correctAnnounce);
    }

    // Broadcast updated room state
    io.to(roomCode).emit('room:state', updatedRoom);

    // If all guessers got it right, finish round immediately
    if (shouldEndRound) {
      await onRoundTimeout(roomCode);
    }
  });
}
