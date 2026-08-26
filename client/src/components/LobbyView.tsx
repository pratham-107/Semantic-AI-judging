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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6"
    >
      {/* Top Banner: Room Code & Hall Pass */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-[#1F3D33] chalkboard-frame p-6 text-[#F6F3EA] rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="z-10">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F4B942] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Classroom Hall Pass
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-mono">
            Room Code:{' '}
            <motion.span
              animate={{ color: ['#F4B942', '#F6F3EA', '#F4B942'] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="text-[#F4B942] tracking-widest font-extrabold"
            >
              {room.roomCode}
            </motion.span>
          </h2>
          <p className="text-xs md:text-sm text-[#F6F3EA]/70 mt-1 font-sans">
            Share this 5-letter code with classmates to join this room.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.06, rotate: -1 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={handleCopyCode}
          className="z-10 flex items-center gap-2 px-6 py-3.5 bg-[#F4B942] text-[#16302A] font-mono font-bold rounded-xl btn-chalk hover:bg-amber-400 text-sm shadow-lg"
        >
          {copied ? <Check className="w-4 h-4 text-green-800" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Code Copied!' : 'Copy Code'}
        </motion.button>
      </motion.div>

      {/* Main Grid: Student Desks + Difficulty Voting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Connected Student Desks (2 Columns) */}
        <div className="md:col-span-2 bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F6F3EA]/10">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#F4B942]" />
              <h3 className="font-mono font-bold text-[#F6F3EA] text-base">
                Classroom Desks ({room.players.length} / {room.settings.maxPlayers})
              </h3>
            </div>
            <span className="text-xs font-mono text-[#F6F3EA]/60">
              {room.settings.totalRounds} Rounds · {room.settings.roundDurationSec}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AnimatePresence>
              {room.players.map((p, idx) => {
                const isThisPlayerHost = p.id === room.hostId;
                const isYou = p.id === currentPlayer?.id;
                const vote = room.difficultyVotes?.[p.id];

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ y: -2 }}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between shadow-sm ${
                      isYou
                        ? 'bg-[#1F3D33] border-[#F4B942] ring-2 ring-[#F4B942]/30 shadow-md'
                        : 'bg-[#1F3D33]/60 border-[#F6F3EA]/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: 10 }}
                        className="w-10 h-10 rounded-full bg-[#F4B942] text-[#16302A] flex items-center justify-center font-mono font-bold text-sm shadow"
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </motion.div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#F6F3EA] font-sans">
                            {p.name}
                          </span>
                          {isYou && (
                            <span className="text-[10px] font-mono font-bold bg-[#F4B942] text-[#16302A] px-1.5 py-0.2 rounded">
                              YOU
                            </span>
                          )}
                          {isThisPlayerHost && (
                            <span title="Host / Teacher">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-mono text-[#F6F3EA]/60">
                          {p.connected ? (
                            <span className="text-green-400">● In Seat</span>
                          ) : (
                            <span className="text-slate-400">○ Away</span>
                          )}
                          {vote && <span className="ml-2 text-amber-300">[{vote}]</span>}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono text-[#F6F3EA]/40">
                      Desk #{idx + 1}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Difficulty Voting & Start Section (1 Column) */}
        <div className="bg-[#16302A] border border-[#F6F3EA]/15 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-mono font-bold text-[#F4B942] text-sm mb-1 uppercase tracking-wider">
              Difficulty Voting
            </h3>
            <p className="text-xs text-[#F6F3EA]/70 mb-3 font-sans">
              Cast your vote for the word bank difficulty:
            </p>

            <div className="space-y-2">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = userVote === opt.id;
                const voteCount = Object.values(room.difficultyVotes || {}).filter((v) => v === opt.id).length;

                return (
                  <motion.button
                    key={opt.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      voteDifficulty(opt.id);
                      soundManager?.playPop();
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-[#F4B942] bg-[#1F3D33] text-[#F6F3EA] shadow ring-1 ring-[#F4B942]'
                        : 'border-[#F6F3EA]/10 bg-[#1F3D33]/40 text-[#F6F3EA]/80 hover:bg-[#1F3D33]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-bold text-[#F6F3EA]">
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-[#F6F3EA]/60">{opt.desc}</div>
                    </div>
                    {voteCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xs font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full"
                      >
                        {voteCount} vote{voteCount > 1 ? 's' : ''}
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Start Game Action */}
          <div className="pt-3 border-t border-[#F6F3EA]/10">
            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.04, rotate: -0.5 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleStartGameClick}
                disabled={room.players.length < 1}
                className="w-full py-4 bg-[#F4B942] text-[#16302A] font-mono font-bold rounded-xl btn-chalk hover:bg-amber-400 flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 text-sm"
              >
                <Bell className="w-5 h-5 text-[#16302A] animate-bounce" />
                Ring Bell & Start Game
              </motion.button>
            ) : (
              <div className="text-center p-3 bg-[#1F3D33] rounded-xl border border-[#F6F3EA]/10">
                <p className="text-xs font-mono text-[#F4B942] font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Waiting for Teacher to ring the bell...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
