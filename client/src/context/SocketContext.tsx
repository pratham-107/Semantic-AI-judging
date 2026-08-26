'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Room,
  Player,
  CurrentRound,
  StrokeData,
  GuessResultPayload,
  CorrectGuesserInfo,
  RoundEndPayload,
  GameEndPayload,
  ChatMessage,
  DifficultyTier,
  RoomSettings,
} from '../types/game.types';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  isDrawer: boolean;
  drawerSecretWord: string | null;
  drawerCategory: string | null;
  messages: ChatMessage[];
  lastGuessResult: GuessResultPayload | null;
  roundEndData: RoundEndPayload | null;
  gameEndData: GameEndPayload | null;
  serverUrl: string;
  createRoom: (playerName: string, settings?: Partial<RoomSettings>, avatarSeed?: string) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string, avatarSeed?: string) => Promise<void>;
  leaveRoom: () => void;
  startGame: () => void;
  voteDifficulty: (tier: DifficultyTier) => void;
  sendStroke: (stroke: StrokeData) => void;
  clearStroke: () => void;
  submitGuess: (text: string) => void;
  dismissRoundEnd: () => void;
  restartGame: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [drawerSecretWord, setDrawerSecretWord] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastGuessResult, setLastGuessResult] = useState<GuessResultPayload | null>(null);
  const [roundEndData, setRoundEndData] = useState<RoundEndPayload | null>(null);
  const [gameEndData, setGameEndData] = useState<GameEndPayload | null>(null);

  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io(serverUrl, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('[Socket] Connected to game server:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    s.on('room:state', (updatedRoom: Room) => {
      console.log('[Socket] Received room:state', updatedRoom);
      setRoom(updatedRoom);
      // Synchronize current player reference
      if (currentPlayer) {
        const syncPlayer = updatedRoom.players.find((p) => p.id === currentPlayer.id);
        if (syncPlayer) setCurrentPlayer(syncPlayer);
      }
    });

    s.on('round:start', (payload) => {
      setRoundEndData(null);
      setLastGuessResult(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: 'Teacher',
          text: `🔔 Round ${payload.roundNumber} started! Drawer is ${payload.drawerName}. Category: [${payload.category || 'General'}]`,
          type: 'system',
          timestamp: Date.now(),
        },
      ]);
    });

    s.on('round:startDrawer', (payload: { word: string; category?: string }) => {
      setDrawerSecretWord(payload.word);
      setDrawerCategory(payload.category || null);
    });

    s.on('guess:result', (result: GuessResultPayload) => {
      setLastGuessResult(result);
      if (result.correct) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            senderName: 'You',
            text: `🎯 You got it right! (+${result.pointsAwarded} pts)`,
            type: 'correct',
            warmth: result.warmth,
            pointsAwarded: result.pointsAwarded,
            timestamp: Date.now(),
          },
        ]);
      } else if (result.warmth >= 75) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            senderName: 'AI Judge',
            text: `🔥 Hot guess! (${result.warmth}% warmth) (+${result.pointsAwarded} partial pts)`,
            type: 'warm',
            warmth: result.warmth,
            pointsAwarded: result.pointsAwarded,
            timestamp: Date.now(),
          },
        ]);
      }
    });

    s.on('guess:correctAnnounce', (payload: CorrectGuesserInfo) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: payload.playerName,
          text: `⭐ Guessed correctly in ${payload.timeTakenSec}s (+${payload.pointsAwarded} pts)!`,
          type: 'correct',
          pointsAwarded: payload.pointsAwarded,
          timestamp: Date.now(),
        },
      ]);
    });

    s.on('round:end', (payload: RoundEndPayload) => {
      setRoundEndData(payload);
      setDrawerSecretWord(null);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          senderName: 'Classroom',
          text: `⌛ Round ended! The secret word was "${payload.word}". Drawer earned ${payload.drawerBonus} bonus points!`,
          type: 'system',
          timestamp: Date.now(),
        },
      ]);
    });

    s.on('game:end', (payload: GameEndPayload) => {
      setGameEndData(payload);
    });

    s.on('error', (err: { code: string; message: string }) => {
      console.warn('[Socket Error]:', err);
      alert(err.message || 'An error occurred');
    });

    return () => {
      s.disconnect();
    };
  }, [serverUrl]);

  const createRoom = useCallback(
    async (playerName: string, settings?: Partial<RoomSettings>, avatarSeed?: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current) return reject('Socket not ready');
        socketRef.current.emit(
          'room:create',
          { playerName, settings, avatarSeed },
          (res: { success: boolean; roomCode?: string; error?: string; player?: Player }) => {
            if (res.success && res.roomCode && res.player) {
              setCurrentPlayer(res.player);
              resolve(res.roomCode);
            } else {
              reject(res.error || 'Failed to create room');
            }
          }
        );
      });
    },
    []
  );

  const joinRoom = useCallback(
    async (roomCode: string, playerName: string, avatarSeed?: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!socketRef.current) return reject('Socket not ready');
        socketRef.current.emit(
          'room:join',
          { roomCode: roomCode.trim().toUpperCase(), playerName, avatarSeed },
          (res: { success: boolean; error?: string; player?: Player }) => {
            if (res.success && res.player) {
              setCurrentPlayer(res.player);
              resolve();
            } else {
              reject(res.error || 'Failed to join room');
            }
          }
        );
      });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('room:leave');
      setRoom(null);
      setCurrentPlayer(null);
      setRoundEndData(null);
      setGameEndData(null);
      setMessages([]);
    }
  }, []);

  const startGame = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('room:startGame');
    }
  }, []);

  const voteDifficulty = useCallback((tier: DifficultyTier) => {
    if (socketRef.current) {
      socketRef.current.emit('difficulty:vote', { tier });
    }
  }, []);

  const sendStroke = useCallback((stroke: StrokeData) => {
    if (socketRef.current) {
      socketRef.current.emit('stroke:draw', stroke);
    }
  }, []);

  const clearStroke = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('stroke:clear');
    }
  }, []);

  const submitGuess = useCallback(
    (text: string) => {
      if (socketRef.current && text.trim()) {
        socketRef.current.emit('guess:submit', { text: text.trim() });
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            senderName: currentPlayer?.name || 'You',
            text: text.trim(),
            type: 'guess',
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [currentPlayer]
  );

  const dismissRoundEnd = useCallback(() => {
    setRoundEndData(null);
  }, []);

  const restartGame = useCallback(() => {
    setGameEndData(null);
    setRoundEndData(null);
    if (socketRef.current) {
      socketRef.current.emit('room:startGame');
    }
  }, []);

  const isHost = Boolean(room && currentPlayer && room.hostId === currentPlayer.id);
  const isDrawer = Boolean(room?.currentRound && currentPlayer && room.currentRound.drawerId === currentPlayer.id);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        room,
        currentPlayer,
        isHost,
        isDrawer,
        drawerSecretWord,
        drawerCategory,
        messages,
        lastGuessResult,
        roundEndData,
        gameEndData,
        serverUrl,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        voteDifficulty,
        sendStroke,
        clearStroke,
        submitGuess,
        dismissRoundEnd,
        restartGame,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketGame() {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketGame must be used within a SocketProvider');
  }
  return ctx;
}
