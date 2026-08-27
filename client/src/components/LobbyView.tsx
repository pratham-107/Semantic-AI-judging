'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketGame } from '../context/SocketContext';
import { DifficultyTier } from '../types/game.types';
import { soundManager } from '../lib/soundManager';
import { Copy, Check, Users, Play, Crown, Sparkles, Bell } from 'lucide-react';

const DIFFICULTY_OPTIONS: { id: DifficultyTier; label: string; desc: string; color: string }[] = [
  { id: 'easy', label: 'Easy (Recess)', desc: 'Everyday objects & animals', color: 'border-green-500 bg-green-500/10' },
  { id: 'medium', label: 'Medium (Pop Quiz)', desc: 'Compound objects & science', color: 'border-amber-500 bg-amber-500/10' },
  { id: 'hard', label: 'Hard (Final Exam)', desc: 'Abstract & space concepts', color: 'border-orange-500 bg-orange-500/10' },
  { id: 'absurd', label: 'Absurd (Detention)', desc: 'Humorous & bizarre prompts', color: 'border-red-500 bg-red-500/10' },
];

export function LobbyView() {
  const { room, currentPlayer, isHost, startGame, voteDifficulty } = useSocketGame();
  const [copied, setCopied] = useState(false);

  if (!room) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    soundManager?.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGameClick = () => {
    soundManager?.playSchoolBell();
    startGame();
  };

  const userVote = currentPlayer ? room.difficultyVotes?.[currentPlayer.id] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-2 md:py-4 space-y-4 md:space-y-6"
    >
      {/* Top Banner: Room Code & Hall Pass */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-[#1F3D33] chalkboard-frame p-4 sm:p-6 text-[#F6F3EA] rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative overflow-hidden"
      >
        <div className="z-10 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-mono font-bold text-[#F4B942] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Classroom Hall Pass
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-mono">
            Room Code:{' '}
            <motion.span
              animate={{ color: ['#F4B942', '#F6F3EA', '#F4B942'] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-[#F4B942] tracking-widest font-extrabold"
            >
              {room.roomCode}
            </motion.span>
          </h2>
          <p className="text-xs text-[#F6F3EA]/70 mt-1 font-sans">
            Share this 5-letter pass with classmates to join this room.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleCopyCode}
          className="z-10 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-[#F4B942] text-[#16302A] font-mono font-bold rounded-xl btn-chalk hover:bg-amber-400 text-xs sm:text-sm shadow-lg"
        >
          {copied ? <Check className="w-4 h-4 text-green-800" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Pass Copied!' : 'Copy Hall Pass'}
        </motion.button>
      </motion.div>

      {/* Main Grid: Student Desks + Difficulty Voting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Connected Student Desks (2 Columns) */}
        <div className="md:col-span-2 bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#F6F3EA]/10">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#F4B942]" />
              <h3 className="font-mono font-bold text-[#F6F3EA] text-sm sm:text-base">
                Classroom Desks ({room.players.length} / {room.settings.maxPlayers})
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs font-mono text-[#F6F3EA]/60">
              {room.settings.totalRounds} R · {room.settings.roundDurationSec}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <AnimatePresence>
              {room.players.map((p, idx) => {
                const isThisPlayerHost = p.id === room.hostId;
                const isYou = p.id === currentPlayer?.id;
                const vote = room.difficultyVotes?.[p.id];

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.85, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ delay: idx * 0.04 }}
                    whileHover={{ y: -2 }}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between shadow-sm ${
                      isYou
                        ? 'bg-[#1F3D33] border-[#F4B942] ring-2 ring-[#F4B942]/30 shadow-md'
                        : 'bg-[#1F3D33]/60 border-[#F6F3EA]/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#F4B942] text-[#16302A] flex items-center justify-center font-mono font-bold text-xs shadow shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs sm:text-sm text-[#F6F3EA] font-sans truncate">
                            {p.name}
                          </span>
                          {isYou && (
                            <span className="text-[9px] font-mono font-bold bg-[#F4B942] text-[#16302A] px-1 rounded shrink-0">
                              YOU
                            </span>
                          )}
                          {isThisPlayerHost && (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs font-mono text-[#F6F3EA]/60">
                          {p.connected ? (
                            <span className="text-green-400">● In Seat</span>
                          ) : (
                            <span className="text-slate-400">○ Away</span>
                          )}
                          {vote && <span className="ml-1.5 text-amber-300">[{vote}]</span>}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-[#F6F3EA]/40 shrink-0">
                      #{idx + 1}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Difficulty Voting & Host Control */}
        <div className="space-y-4">
          {/* Difficulty Voting Card */}
          <div className="bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <h4 className="font-mono font-bold text-[#F6F3EA] text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
              <span>🗳️</span> Vote Word Difficulty
            </h4>

            <div className="space-y-1.5">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = userVote === opt.id;
                const voteCount = Object.values(room.difficultyVotes || {}).filter(
                  (v) => v === opt.id
                ).length;

                return (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      voteDifficulty(opt.id);
                      soundManager?.playPop();
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#F4B942] bg-[#F4B942]/20 ring-1 ring-[#F4B942]'
                        : 'border-[#F6F3EA]/10 bg-[#1F3D33]/60 hover:bg-[#1F3D33]'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-xs text-[#F6F3EA]">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-[#F6F3EA]/60 font-sans">
                        {opt.desc}
                      </div>
                    </div>

                    {voteCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono font-bold text-[#F4B942]">
                        {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Host Start Game Trigger */}
          <div className="bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-4 sm:p-5 shadow-lg text-center space-y-3">
            {isHost ? (
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleStartGameClick}
                  className="w-full py-3.5 bg-[#F4B942] text-[#16302A] font-mono font-extrabold text-sm rounded-xl btn-chalk hover:bg-amber-400 flex items-center justify-center gap-2 shadow-xl"
                >
                  <Bell className="w-4 h-4 animate-bounce" />
                  Ring School Bell & Start Game
                </motion.button>
                <p className="text-[11px] font-mono text-[#F6F3EA]/60">
                  {room.players.length < 2
                    ? '⚠️ Waiting for at least 1 more student to join...'
                    : 'Class is assembled! Ready to start whenever you are.'}
                </p>
              </div>
            ) : (
              <div className="py-2 text-xs font-mono text-[#F6F3EA]/70 flex flex-col items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <span>Waiting for the Teacher / Host to ring the bell and start the round...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
