import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Room, Player, RoomSettings, RoomStatus, DifficultyTier } from '../types/room.types.js';
import { redisService } from './redisService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-sketchai-key-change-in-prod';
const ROOM_TTL_SECONDS = 7200; // 2 hours

export class RoomService {
  /**
   * Generates a 5-character alphanumeric room code (collision checked).
   */
  public static async generateUniqueRoomCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous 0,O,1,I
    let attempts = 0;
    while (attempts < 10) {
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const exists = await redisService.exists(`room:${code}`);
      if (!exists) {
        return code;
      }
      attempts++;
    }
    // Fallback: timestamp-based code
    return uuidv4().substring(0, 5).toUpperCase();
  }

  /**
   * Creates a JWT token for a player session.
   */
  public static generatePlayerToken(playerId: string, roomCode: string, playerName: string): string {
    return jwt.sign(
      { playerId, roomCode, playerName },
      JWT_SECRET,
      { expiresIn: '6h' }
    );
  }

  /**
   * Verifies a JWT token.
   */
  public static verifyPlayerToken(token: string): { playerId: string; roomCode: string; playerName: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { playerId: string; roomCode: string; playerName: string };
    } catch {
      return null;
    }
  }

  /**
   * Creates a new room and assigns the host player.
   */
  public static async createRoom(
    hostName: string,
    customSettings?: Partial<RoomSettings>,
    avatarSeed?: string
  ): Promise<{ room: Room; hostPlayer: Player; token: string }> {
    const roomCode = await this.generateUniqueRoomCode();
    const hostId = uuidv4();

    const settings: RoomSettings = {
      maxPlayers: customSettings?.maxPlayers ?? 8,
      totalRounds: customSettings?.totalRounds ?? 5,
      roundDurationSec: customSettings?.roundDurationSec ?? 80,
      difficultyVoting: customSettings?.difficultyVoting ?? true,
    };

    const hostPlayer: Player = {
      id: hostId,
      name: hostName.trim() || 'Player 1',
      connected: true,
      score: 0,
      isDrawer: false,
      avatarSeed: avatarSeed || hostName,
    };

    const room: Room = {
      roomCode,
      hostId,
      status: 'WAITING',
      settings,
      players: [hostPlayer],
      currentRound: null,
      roundHistory: [],
      difficultyVotes: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.saveRoom(room);
    const token = this.generatePlayerToken(hostId, roomCode, hostPlayer.name);

    return { room, hostPlayer, token };
  }

  /**
   * Joins an existing room.
   */
  public static async joinRoom(
    roomCode: string,
    playerName: string,
    avatarSeed?: string,
    existingPlayerId?: string
  ): Promise<{ room: Room; player: Player; token: string }> {
    const normalizedCode = roomCode.trim().toUpperCase();
    const room = await this.getRoom(normalizedCode);

    if (!room) {
      throw new Error(`Room '${normalizedCode}' not found.`);
    }

    if (room.status === 'FINISHED') {
      throw new Error('This game has already finished.');
    }

    // Reconnecting player check
    if (existingPlayerId) {
      const existing = room.players.find((p) => p.id === existingPlayerId);
      if (existing) {
        existing.connected = true;
        existing.name = playerName.trim() || existing.name;
        room.updatedAt = Date.now();
        await this.saveRoom(room);
        const token = this.generatePlayerToken(existing.id, room.roomCode, existing.name);
        return { room, player: existing, token };
      }
    }

    if (room.players.length >= room.settings.maxPlayers) {
      throw new Error('Room is already full.');
    }

    const playerId = uuidv4();
    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim() || `Player ${room.players.length + 1}`,
      connected: true,
      score: 0,
      isDrawer: false,
      avatarSeed: avatarSeed || playerName,
    };

    room.players.push(newPlayer);
    room.updatedAt = Date.now();
    await this.saveRoom(room);

    const token = this.generatePlayerToken(playerId, room.roomCode, newPlayer.name);
    return { room, player: newPlayer, token };
  }

  /**
   * Retrieves room state from Redis.
   */
  public static async getRoom(roomCode: string): Promise<Room | null> {
    const code = roomCode.trim().toUpperCase();
    return redisService.get<Room>(`room:${code}`);
  }

  /**
   * Persists room state to Redis with TTL.
   */
  public static async saveRoom(room: Room): Promise<void> {
    room.updatedAt = Date.now();
    await redisService.set(`room:${room.roomCode}`, room, ROOM_TTL_SECONDS);
  }

  /**
   * Removes a player from a room or marks disconnected.
   */
  public static async leaveRoom(
    roomCode: string,
    playerId: string
  ): Promise<{ room: Room | null; removedPlayer: Player | null; newHost: Player | null }> {
    const room = await this.getRoom(roomCode);
    if (!room) return { room: null, removedPlayer: null, newHost: null };

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return { room, removedPlayer: null, newHost: null };

    const [removedPlayer] = room.players.splice(playerIndex, 1);
    let newHost: Player | null = null;

    // Delete room if empty
    if (room.players.length === 0) {
      await redisService.del(`room:${room.roomCode}`);
      return { room: null, removedPlayer, newHost: null };
    }

    // Host migration if host left
    if (room.hostId === playerId) {
      const activePlayer = room.players.find((p) => p.connected) || room.players[0];
      room.hostId = activePlayer.id;
      newHost = activePlayer;
    }

    await this.saveRoom(room);
    return { room, removedPlayer, newHost };
  }

  /**
   * Handles player disconnection (marks player connected: false and migrates host if needed).
   */
  public static async handleDisconnect(
    socketId: string
  ): Promise<{ room: Room; player: Player; newHost?: Player } | null> {
    // Look up socket mapping from memory or redis key
    const mapping = await redisService.get<{ roomCode: string; playerId: string }>(`socket:${socketId}`);
    if (!mapping) return null;

    const room = await this.getRoom(mapping.roomCode);
    if (!room) return null;

    const player = room.players.find((p) => p.id === mapping.playerId);
    if (!player) return null;

    player.connected = false;
    player.socketId = undefined;
    let newHost: Player | undefined;

    // If host disconnected, promote next connected player
    if (room.hostId === player.id) {
      const nextActive = room.players.find((p) => p.connected && p.id !== player.id);
      if (nextActive) {
        room.hostId = nextActive.id;
        newHost = nextActive;
      }
    }

    await this.saveRoom(room);
    await redisService.del(`socket:${socketId}`);

    return { room, player, newHost };
  }

  /**
   * Registers a socket ID with a player and room.
   */
  public static async registerPlayerSocket(roomCode: string, playerId: string, socketId: string): Promise<Room | null> {
    const room = await this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = true;
      player.socketId = socketId;
      await this.saveRoom(room);
      await redisService.set(`socket:${socketId}`, { roomCode, playerId }, ROOM_TTL_SECONDS);
    }
    return room;
  }

  /**
   * Votes for difficulty tier.
   */
  public static async voteDifficulty(roomCode: string, playerId: string, tier: DifficultyTier): Promise<Room | null> {
    const room = await this.getRoom(roomCode);
    if (!room) return null;

    if (!room.difficultyVotes) {
      room.difficultyVotes = {};
    }
    room.difficultyVotes[playerId] = tier;
    await this.saveRoom(room);
    return room;
  }
}
