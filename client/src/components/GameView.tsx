'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../context/SocketContext';
import { Canvas } from './Canvas';
import { WarmthGauge } from './WarmthGauge';
import { RoundEndModal } from './RoundEndModal';
import { GameEndModal } from './GameEndModal';
import { soundManager } from '../lib/soundManager';
import {
  Clock,
  Send,
  CheckCircle2,
  Trophy,
  Pencil,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
  const [showMobileScores, setShowMobileScores] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const currentRound = room?.currentRound;

  // Real-time countdown timer
  useEffect(() => {
    if (!currentRound?.endsAt) return;

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

  if (!room) return null;

  const hasAlreadyGuessed = Boolean(
    currentRound &&
      currentPlayer &&
      currentRound.correctGuessers.some((g) => g.playerId === currentPlayer.id)
  );

  const timerPercentage = currentRound
    ? Math.max(0, Math.min(100, (timeLeft / (room.settings.roundDurationSec || 80)) * 100))
    : 0;
  const isTimeLow = currentRound ? timeLeft <= 15 : false;

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim() || isDrawer || hasAlreadyGuessed || !currentRound) return;
    submitGuess(guessInput);
    setGuessInput('');
    soundManager?.playPop();
  };

  const drawerPlayer = currentRound
    ? room.players.find((p) => p.id === currentRound.drawerId)
    : null;

  // Find recent correct guessers for celebration banner
  const lastCorrectGuesser = currentRound?.correctGuessers[currentRound.correctGuessers.length - 1];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 md:px-6 py-2 md:py-4 space-y-2.5 sm:space-y-4"
    >
      {/* 1. TOP HEADER: Round info, Secret Word / Hint, Live Clock */}
      <motion.div
        layout
        className="bg-[#16302A] border border-[#F6F3EA]/20 rounded-xl md:rounded-2xl p-2.5 sm:p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-2 max-w-full"
      >
        {/* Top Row on Mobile: Round Pill & Live Timer */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-[#1F3D33] border border-[#F6F3EA]/20 font-mono text-[10px] sm:text-xs text-[#F6F3EA] font-bold shadow-inner shrink-0">
              {currentRound ? (
                <>R {currentRound.roundNumber}/{room.settings.totalRounds}</>
              ) : (
                <>Intermission</>
              )}
            </div>
            <div className="text-[10px] sm:text-xs font-sans text-[#F6F3EA]/80 flex items-center gap-1 truncate max-w-[120px]">
              <Pencil className="w-3 h-3 text-[#F4B942] shrink-0" />
              <span className="truncate font-bold text-[#F4B942]">
                {drawerPlayer?.name || 'Classmate'}
              </span>
            </div>
          </div>

          <motion.div
            animate={isTimeLow ? { scale: [1, 1.08, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className={`flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-xl font-mono text-xs sm:text-sm font-bold border transition-colors shadow sm:hidden ${
              isTimeLow
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                : 'bg-[#1F3D33] text-[#F4B942] border-[#F6F3EA]/20'
            }`}
          >
            <Clock className={`w-3 h-3 ${isTimeLow ? 'text-red-400 animate-spin' : 'text-[#F4B942]'}`} />
            <span>{currentRound ? `${timeLeft}s` : '---'}</span>
          </motion.div>
        </div>

        {/* Center: Secret Word or Masked Hint */}
        <div className="text-center px-1 max-w-full">
          {currentRound ? (
            isDrawer ? (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                  Secret Word to Draw:
                </div>
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-base sm:text-xl md:text-2xl font-mono font-extrabold text-[#F4B942] tracking-wider uppercase truncate"
                >
                  {drawerSecretWord || currentRound.word}
                </motion.div>
                <div className="text-[10px] text-[#F6F3EA]/60 font-sans hidden sm:block">
                  [{drawerCategory || currentRound.category || 'General'}]
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-[#F6F3EA]/60 font-bold">
                  [{currentRound.category || 'General'}]
                </div>
                <motion.div
                  key={currentRound.wordHint}
                  className="text-base sm:text-xl md:text-2xl font-mono font-bold text-[#F6F3EA] tracking-widest truncate"
                >
                  {currentRound.wordHint}
                </motion.div>
              </div>
            )
          ) : (
            <div className="text-center py-0.5">
              <span className="text-xs sm:text-sm font-mono font-bold text-[#F4B942] animate-pulse">
                🔔 Intermission · Next Round Starting Soon...
              </span>
            </div>
          )}
        </div>

        {/* Right Desktop Clock */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <motion.div
            animate={isTimeLow ? { scale: [1, 1.08, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border transition-colors shadow ${
              isTimeLow
                ? 'bg-red-500/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                : 'bg-[#1F3D33] text-[#F4B942] border-[#F6F3EA]/20'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isTimeLow ? 'text-red-400 animate-spin' : 'text-[#F4B942]'}`} />
            <span>{currentRound ? `${timeLeft}s` : '---'}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Timer Progress Bar */}
      {currentRound && (
        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-[#F6F3EA]/10">
          <motion.div
            className={`h-full rounded-full transition-all duration-300 ${
              isTimeLow ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-[#F4B942]'
            }`}
            style={{ width: `${timerPercentage}%` }}
          />
        </div>
      )}

      {/* Correct Guesser Live Toast Banner */}
      <AnimatePresence>
        {lastCorrectGuesser && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-2 sm:p-2.5 rounded-xl bg-green-950/80 border-2 border-green-500/60 text-green-300 font-mono text-xs font-bold flex items-center justify-between shadow-lg max-w-full"
          >
            <div className="flex items-center gap-1.5 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span className="truncate">
                🎉 <span className="text-white">{lastCorrectGuesser.playerName}</span> cracked the word!
              </span>
            </div>
            <span className="bg-green-500 text-[#16302A] px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold shrink-0">
              +{lastCorrectGuesser.pointsAwarded} pts
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button for Classroom Scoreboard */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileScores(!showMobileScores)}
          className="w-full py-1.5 px-3 rounded-xl bg-[#16302A] border border-[#F6F3EA]/15 text-xs font-mono font-bold text-[#F6F3EA] flex items-center justify-between shadow-sm"
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[#F4B942]" />
            Classroom Standings ({room.players.length} Students)
          </span>
          {showMobileScores ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* MAIN GAME LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 items-start max-w-full">
        {/* Left Sidebar: Scoreboard */}
        <div
          className={`lg:col-span-3 bg-[#16302A] border border-[#F6F3EA]/15 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg space-y-2 max-w-full ${
            showMobileScores ? 'block' : 'hidden lg:block'
          } order-2 lg:order-1`}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-[#F6F3EA]/10">
            <Trophy className="w-4 h-4 text-[#F4B942]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F6F3EA]">
              Classroom Scoreboard
            </h3>
          </div>

          <div className="space-y-1.5 max-h-48 lg:max-h-96 overflow-y-auto pr-1">
            <AnimatePresence>
              {room.players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => {
                  const isGuessed = currentRound?.correctGuessers.some((g) => g.playerId === p.id);
                  const isThisDrawer = currentRound?.drawerId === p.id;
                  const isYou = p.id === currentPlayer?.id;

                  return (
                    <motion.div
                      layout
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-1.5 sm:p-2 rounded-xl border flex items-center justify-between text-xs transition-all shadow-sm ${
                        isYou
                          ? 'bg-[#1F3D33] border-[#F4B942] ring-1 ring-[#F4B942]/50 shadow-md'
                          : 'bg-[#1F3D33]/60 border-[#F6F3EA]/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-[#F4B942] w-4 text-[10px] sm:text-[11px]">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="flex items-center gap-1 font-bold text-[#F6F3EA] truncate font-sans">
                            <span className="truncate">{p.name}</span>
                            {isThisDrawer && (
                              <span className="text-[9px] font-mono bg-amber-400 text-[#16302A] px-1 rounded font-bold shrink-0">
                                ✏️ DRAW
                              </span>
                            )}
                            {isGuessed && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-[#F6F3EA] bg-black/40 px-2 py-0.5 rounded text-right shrink-0 text-xs">
                        {p.score} <span className="text-[9px] text-[#F6F3EA]/60">pts</span>
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Canvas Area (Full width on mobile, 6 cols on desktop) */}
        <div className="lg:col-span-6 bg-[#16302A] border border-[#F6F3EA]/15 rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 shadow-xl order-1 lg:order-2 max-w-full overflow-hidden">
          <Canvas isDrawer={isDrawer} disabled={!currentRound} />
        </div>

        {/* Right Sidebar: AI Warmth + Guesser Chat Feed */}
        <div className="lg:col-span-3 space-y-2.5 sm:space-y-3 order-3 lg:order-3 max-w-full">
          {/* AI Semantic Warmth Meter */}
          {!isDrawer && currentRound && <WarmthGauge lastResult={lastGuessResult} />}

          {/* Chat / Guess Feed Container */}
          <div className="bg-[#16302A] border border-[#F6F3EA]/15 rounded-xl md:rounded-2xl p-2.5 sm:p-3 shadow-lg flex flex-col h-[240px] sm:h-[300px] md:h-[380px] max-w-full">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#F6F3EA]/10">
              <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-[#F6F3EA]/80">
                Classroom Guesses
              </span>
              {currentRound && (
                <span className="text-[10px] font-mono text-[#F4B942]">
                  {currentRound.correctGuessers.length} Correct
                </span>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs max-w-full">
              {messages.length === 0 ? (
                <div className="text-center py-6 text-[#F6F3EA]/40 text-xs font-mono">
                  Type your guess below! Near-misses get live warmth hints!
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m) => {
                    if (m.type === 'correct') {
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="p-1.5 rounded-lg bg-green-950/60 border border-green-500/40 text-green-300 font-sans font-bold shadow-sm text-xs"
                        >
                          {m.text}
                        </motion.div>
                      );
                    }
                    if (m.type === 'warm') {
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className="p-1.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 font-sans font-semibold shadow-sm text-xs"
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
                          className="p-1 rounded bg-[#1F3D33] text-[#F4B942] font-mono text-[10px] sm:text-[11px] border border-[#F6F3EA]/10"
                        >
                          {m.text}
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-1 rounded bg-[#1F3D33]/60 text-[#F6F3EA] font-sans flex items-baseline gap-1 text-xs"
                      >
                        <span className="font-bold text-[#F4B942] font-mono text-[10px] sm:text-[11px]">
                          {m.senderName}:
                        </span>
                        <span className="break-words max-w-full">{m.text}</span>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Guesser Input Form */}
            {!isDrawer ? (
              <form onSubmit={handleGuessSubmit} className="pt-2 border-t border-[#F6F3EA]/10 mt-1">
                {hasAlreadyGuessed ? (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="text-center p-1.5 rounded-lg bg-green-900/40 text-green-300 font-mono text-xs font-bold border border-green-500/30 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    Word Solved! Enjoy the show!
                  </motion.div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder={currentRound ? "Type your guess..." : "Waiting for next round..."}
                      disabled={!currentRound}
                      className="flex-1 px-2.5 py-1.5 bg-[#1F3D33] text-[#F6F3EA] placeholder-[#F6F3EA]/40 text-xs font-sans rounded-lg sm:rounded-xl border border-[#F6F3EA]/20 focus:outline-none focus:border-[#F4B942] disabled:opacity-50"
                      maxLength={40}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={!guessInput.trim() || !currentRound}
                      className="p-2 bg-[#F4B942] text-[#16302A] rounded-lg sm:rounded-xl btn-chalk hover:bg-amber-400 disabled:opacity-40 transition-opacity shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                )}
              </form>
            ) : (
              <div className="pt-1.5 border-t border-[#F6F3EA]/10 mt-1 text-center text-[10px] sm:text-[11px] font-mono text-amber-300/80">
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
