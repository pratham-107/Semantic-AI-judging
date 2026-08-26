'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../context/SocketContext';
import { Canvas } from './Canvas';
import { WarmthGauge } from './WarmthGauge';
import { RoundEndModal } from './RoundEndModal';
import { GameEndModal } from './GameEndModal';
import { soundManager } from '../lib/soundManager';
import { Clock, Send, Sparkles, CheckCircle2, Trophy, Flame, Pencil } from 'lucide-react';

export function GameView() {
  const {
    room,
    currentPlayer,
    isDrawer,
    drawerSecretWord,
    drawerCategory,
    messages,
    lastGuessResult,
    submitGuess,
  } = useSocketGame();

  const [guessInput, setGuessInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(80);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const currentRound = room?.currentRound;

  // Real-time countdown timer
  useEffect(() => {
    if (!currentRound) return;

    const updateTimer = () => {
      const remainingMs = Math.max(0, currentRound.endsAt - Date.now());
      const sec = Math.ceil(remainingMs / 1000);
      setTimeLeft(sec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRound?.endsAt]);

  // Scroll chat feed to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!room || !currentRound) return null;

  const hasAlreadyGuessed = currentRound.correctGuessers.some((g) => g.playerId === currentPlayer?.id);
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / room.settings.roundDurationSec) * 100));
  const isTimeLow = timeLeft <= 15;

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isDrawer || hasAlreadyGuessed) return;
    submitGuess(guessInput);
    setGuessInput('');
    soundManager?.playPop();
  };

  const drawerPlayer = room.players.find((p) => p.id === currentRound.drawerId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-7xl mx-auto p-3 md:p-6 space-y-4"
    >
      {/* Top Header Bar: Round, Timer, Word Hint */}
      <motion.div
        layout
        className="bg-[#16302A] border border-[#F6F3EA]/20 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        {/* Left: Round & Drawer Info */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-[#1F3D33] border border-[#F6F3EA]/20 font-mono text-xs text-[#F6F3EA] font-bold shadow-inner">
            Round {currentRound.roundNumber} / {room.settings.totalRounds}
          </div>
          <div className="text-xs font-sans text-[#F6F3EA]/80 flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5 text-[#F4B942]" />
            Drawing: <span className="font-bold text-[#F4B942]">{drawerPlayer?.name || 'Classmate'}</span>
          </div>
        </div>

        {/* Center: Secret Word or Masked Hint */}
        <div className="text-center">
          {isDrawer ? (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                Your Secret Word to Draw:
              </div>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="text-xl md:text-2xl font-mono font-extrabold text-[#F4B942] tracking-wider uppercase"
              >
                {drawerSecretWord || currentRound.word}
              </motion.div>
              <div className="text-[11px] text-[#F6F3EA]/60 font-sans">
                Category: [{drawerCategory || currentRound.category || 'General'}]
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#F6F3EA]/60 font-bold">
                Category: [{currentRound.category || 'General'}]
              </div>
              <motion.div
                key={currentRound.wordHint}
                className="text-xl md:text-2xl font-mono font-bold text-[#F6F3EA] tracking-widest"
              >
                {currentRound.wordHint}
              </motion.div>
            </div>
          )}
        </div>

        {/* Right: Authoritative Timer Clock */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={isTimeLow ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors shadow ${
              isTimeLow
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-[#1F3D33] text-[#F4B942] border-[#F6F3EA]/20'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeLow ? 'text-red-400 animate-spin' : 'text-[#F4B942]'}`} />
            <span>{timeLeft}s</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Timer Progress Bar */}
      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-[#F6F3EA]/10 p-0.5">
        <motion.div
          className={`h-full rounded-full transition-colors duration-500 ${
            isTimeLow ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#F4B942]'
          }`}
          style={{ width: `${timerPercentage}%` }}
        />
      </div>

      {/* Main Game Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Sidebar: Live Scoreboard (3 cols) */}
        <div className="lg:col-span-3 bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-4 shadow-lg space-y-3 order-3 lg:order-1">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F6F3EA]/10">
            <Trophy className="w-4 h-4 text-[#F4B942]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F6F3EA]">
              Classroom Scoreboard
            </h3>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {room.players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => {
                  const isGuessed = currentRound.correctGuessers.some((g) => g.playerId === p.id);
                  const isThisDrawer = p.id === currentRound.drawerId;
                  const isYou = p.id === currentPlayer?.id;

                  return (
                    <motion.div
                      layout
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all shadow-sm ${
                        isYou
                          ? 'bg-[#1F3D33] border-[#F4B942] ring-1 ring-[#F4B942]/50 shadow-md'
                          : 'bg-[#1F3D33]/60 border-[#F6F3EA]/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-[#F4B942] w-4 text-[11px]">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="flex items-center gap-1 font-bold text-[#F6F3EA] truncate font-sans">
                            {p.name}
                            {isThisDrawer && (
                              <span className="text-[9px] font-mono bg-amber-400 text-[#16302A] px-1 py-0.2 rounded font-bold">
                                DRAWER
                              </span>
                            )}
                            {isGuessed && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                title="Guessed Correctly"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                              </motion.span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-[#F6F3EA]/50">
                            {p.connected ? '● In Seat' : '○ Away'}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-[#F6F3EA] bg-black/40 px-2 py-1 rounded text-right shrink-0">
                        {p.score} <span className="text-[9px] text-[#F6F3EA]/60">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Canvas Area (6 cols) */}
        <div className="lg:col-span-6 bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-3 md:p-4 shadow-xl order-1 lg:order-2">
          <Canvas isDrawer={isDrawer} />
        </div>

        {/* Right Sidebar: AI Warmth + Guesser Chat Feed (3 cols) */}
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-3">
          {/* AI Semantic Warmth Meter */}
          {!isDrawer && <WarmthGauge lastResult={lastGuessResult} />}

          {/* Chat / Guess Feed Container */}
          <div className="bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-3 shadow-lg flex flex-col h-[340px] md:h-[400px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F6F3EA]/10">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F6F3EA]/80">
                Classroom Guesses
              </span>
              <span className="text-[10px] font-mono text-[#F4B942]">
                {currentRound.correctGuessers.length} Correct
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-[#F6F3EA]/40 text-xs font-mono">
                  Type your guess below! Near-misses get warmth hints!
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    if (m.type === 'correct') {
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="p-2 rounded-lg bg-green-950/60 border border-green-500/40 text-green-300 font-sans font-bold shadow"
                        >
                          {m.text}
                        </motion.div>
                      );
                    }
                    if (m.type === 'warm') {
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="p-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 font-sans font-semibold shadow"
                        >
                          {m.text}
                        </motion.div>
                      );
                    }
                    if (m.type === 'system') {
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-1.5 rounded bg-[#1F3D33] text-[#F4B942] font-mono text-[11px] border border-[#F6F3EA]/10"
                        >
                          {m.text}
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-1.5 rounded bg-[#1F3D33]/60 text-[#F6F3EA] font-sans flex items-baseline gap-1.5"
                      >
                        <span className="font-bold text-[#F4B942] font-mono text-[11px]">
                          {m.senderName}:
                        </span>
                        <span>{m.text}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Guesser Input Form */}
            {!isDrawer ? (
              <form onSubmit={handleGuessSubmit} className="pt-2 border-t border-[#F6F3EA]/10 mt-2">
                {hasAlreadyGuessed ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="text-center p-2 rounded-lg bg-green-900/40 text-green-300 font-mono text-xs font-bold border border-green-500/30 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Word Solved! Enjoy the show!
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Type your guess..."
                      className="flex-1 px-3 py-2 bg-[#1F3D33] text-[#F6F3EA] placeholder-[#F6F3EA]/40 text-xs font-sans rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942]"
                      maxLength={40}
                    />
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      type="submit"
                      disabled={!guessInput.trim()}
                      className="p-2 bg-[#F4B942] text-[#16302A] rounded-xl btn-chalk hover:bg-amber-400 disabled:opacity-40 transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}
              </form>
            ) : (
              <div className="pt-2 border-t border-[#F6F3EA]/10 mt-2 text-center text-[11px] font-mono text-amber-300/80">
                ✏️ You are drawing! Guessing disabled.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals with Framer Motion Transitions */}
      <RoundEndModal />
      <GameEndModal />
    </motion.div>
  );
}
